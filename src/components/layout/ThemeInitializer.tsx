export default function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var stored = localStorage.getItem('ccp-theme');
              if (stored === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            } catch (e) {}
            // Set sidebar width before first paint to prevent layout shift
            try {
              if (window.innerWidth >= 768) {
                document.documentElement.style.setProperty('--sidebar-width', '240px');
              } else {
                document.documentElement.style.setProperty('--sidebar-width', '0px');
              }
            } catch (e) {}
          })();
        `,
      }}
    />
  )
}
