// vim: tabstop=4 expandtab shiftwidth=4 softtabstop=4
const DEFAULT_THEME = 'light';

class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme');

    if (this.theme === null) {
        this.theme = (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    this.setTheme(this.theme);
  }

  setTheme(theme) {
      this.theme = theme;

      if (theme) {
          if (theme !== DEFAULT_THEME) {
            localStorage.setItem('theme', theme);
          }
          document.documentElement.setAttribute('data-theme', theme);
      } else {
          localStorage.removeItem('theme');
          document.documentElement.removeAttribute('data-theme');
      }
  }

  clearTheme() {
      this.setTheme(null);
  }
}

export { ThemeManager }
