function toolsApp() {
  return {
    searchQuery: '',
    activeCategory: '',
    mobileMenuOpen: false,
    tools: [],
    filteredTools: [],
    categories: [],

    init() {
      this.tools = TOOLS_DATA;
      this.categories = CATEGORIES_DATA;
      this.filteredTools = [...this.tools];

      // Support URL query param ?q=...
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        this.searchQuery = q;
        this.filterTools();
      }

      // Close mobile menu on resize
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) this.mobileMenuOpen = false;
      });

      // Sticky header shadow
      window.addEventListener('scroll', () => {
        const header = document.querySelector('.site-header');
        if (header) {
          header.classList.toggle('scrolled', window.scrollY > 10);
        }
      });
    },

    filterTools() {
      const q = this.searchQuery.toLowerCase().trim();
      const cat = this.activeCategory;

      this.filteredTools = this.tools.filter(tool => {
        const matchesQuery = !q ||
          tool.title.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q) ||
          tool.categories.some(c => c.toLowerCase().includes(q));

        const matchesCat = !cat || tool.categories.includes(cat);

        return matchesQuery && matchesCat;
      });
    },
  };
}
