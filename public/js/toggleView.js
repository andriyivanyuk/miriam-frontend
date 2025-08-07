// document.addEventListener("DOMContentLoaded", () => {
//   const tabs = document.querySelectorAll(".nav-tabs li a");
//   const panes = document.querySelectorAll(".tab-content .tab-pane");

//   console.log(tabs, panes);

//   tabs.forEach((tab) => {
//     tab.addEventListener("click", (e) => {
//       e.preventDefault();

//       // Знімаємо active з усіх табів
//       tabs.forEach((t) => t.classList.remove("active", "show"));
//       // Ставимо active на обраний таб
//       tab.classList.add("active", "show");

//       // Знімаємо active з усіх блоків з товарами
//       panes.forEach((pane) => pane.classList.remove("in", "active", "show"));

//       // Отримуємо ID таба, наприклад "#grid" або "#list"
//       const target = document.querySelector(tab.getAttribute("href"));
//       if (target) {
//         target.classList.add("in", "active", "show");
//       }
//     });
//   });
// });
