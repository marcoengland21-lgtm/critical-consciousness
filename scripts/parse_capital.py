#!/usr/bin/env python3
"""Parse Capital Ch.1 HTML into 4 section text files for database insertion."""

import re
import json
import sys
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    """Extract text from HTML, preserving paragraph breaks."""
    def __init__(self):
        super().__init__()
        self.text = []
        self.current = []
        self.in_sup = False
        self.in_footnote_link = False
        self.skip = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'sup':
            self.in_sup = True
        elif tag == 'a' and 'href' in attrs_dict and '#' in attrs_dict.get('href', ''):
            if self.in_sup:
                self.in_footnote_link = True
        elif tag in ('p', 'blockquote'):
            self.current = []
        elif tag == 'br':
            self.current.append('\n')

    def handle_endtag(self, tag):
        if tag == 'sup':
            self.in_sup = False
            self.in_footnote_link = False
        elif tag in ('p', 'blockquote'):
            text = ''.join(self.current).strip()
            if text:
                self.text.append(text)
            self.current = []

    def handle_data(self, data):
        if not self.in_sup:
            self.current.append(data)

    def get_text(self):
        return '\n\n'.join(self.text)


def extract_sections(html_content):
    """Split HTML into 4 sections based on SECTION headings."""

    # Find section boundaries using regex on the HTML
    # Sections are marked with <h3> or <h4> tags containing "SECTION 1", etc.
    section_pattern = r'<[hH][1-6][^>]*>\s*SECTION\s*(\d)'

    matches = list(re.finditer(section_pattern, html_content, re.IGNORECASE))

    if len(matches) < 4:
        print(f"Warning: Found only {len(matches)} section markers", file=sys.stderr)
        return None

    sections = {}
    section_titles = {
        '1': 'The Two Factors of a Commodity: Use-Value and Value',
        '2': 'The Twofold Character of the Labour Embodied in Commodities',
        '3': 'The Form of Value, or Exchange-Value',
        '4': 'The Fetishism of Commodities and the Secret Thereof'
    }

    # Find the "Footnotes" section to know where Section 4 ends
    footnotes_match = re.search(r'<[hH][1-6][^>]*>\s*Footnotes\s*</[hH][1-6]>', html_content, re.IGNORECASE)
    end_pos = footnotes_match.start() if footnotes_match else len(html_content)

    for i, match in enumerate(matches[:4]):
        section_num = match.group(1)
        start = match.end()

        # Find the end of this section (start of next section or footnotes)
        if i + 1 < len(matches[:4]):
            end = matches[i + 1].start()
        else:
            end = end_pos

        section_html = html_content[start:end]

        # Skip the section title heading that follows "SECTION N"
        # Remove the heading that contains the section title
        section_html = re.sub(r'^.*?</[hH][1-6]>', '', section_html, count=1, flags=re.DOTALL)

        # Extract text
        extractor = TextExtractor()
        extractor.feed(section_html)
        text = extractor.get_text()

        # Clean up whitespace
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()

        sections[section_num] = {
            'title': section_titles[section_num],
            'content': text,
            'chapter_number': int(section_num),
        }

        print(f"Section {section_num}: {section_titles[section_num]}", file=sys.stderr)
        print(f"  Length: {len(text)} chars, ~{len(text.split())} words", file=sys.stderr)

    return sections


def main():
    with open('capital_ch1_raw.html', 'r', encoding='utf-8') as f:
        html = f.read()

    sections = extract_sections(html)
    if not sections:
        print("Failed to extract sections", file=sys.stderr)
        sys.exit(1)

    # Write individual section files
    for num, data in sections.items():
        filename = f'capital_ch1_s{num}.txt'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(data['content'])
        print(f"Wrote {filename}", file=sys.stderr)

    # Write JSON for database insertion
    output = {
        'document': {
            'title': 'Capital, Volume I',
            'slug': 'capital-vol-1'
        },
        'chapters': [
            {
                'chapter_number': data['chapter_number'],
                'title': data['title'],
                'content': data['content'],
                'sort_order': data['chapter_number'],
            }
            for data in sections.values()
        ]
    }

    with open('capital_ch1_data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("\nWrote capital_ch1_data.json", file=sys.stderr)
    print(json.dumps({'status': 'ok', 'sections': len(sections)}))


if __name__ == '__main__':
    main()
