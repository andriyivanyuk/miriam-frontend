document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".nav-tabs li a");
  const panes = document.querySelectorAll(".tab-content .tab-pane");

  console.log(tabs, panes);

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();

      tabs.forEach((t) => t.classList.remove("active", "show"));
      tab.classList.add("active", "show");

      panes.forEach((pane) => pane.classList.remove("in", "active", "show"));

      const target = document.querySelector(tab.getAttribute("href"));
      if (target) {
        target.classList.add("in", "active", "show");
      }
    });
  });
});
