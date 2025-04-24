import './index.css';

document.addEventListener("DOMContentLoaded", function () {
  // --- Carousel highlight code ---
  const carousels = document.querySelectorAll('ul[data-shelf="haveread"], ul[data-shelf="toread"]');
  carousels.forEach(carousel => {
    const books = carousel.querySelectorAll('.book-container');
    let currentMostCentered = null;

    function getElementClosestToCenter(elements) {
      const viewportCenterX = window.innerWidth / 2 - 400;
      let closest = null;
      let closestDistance = Infinity;

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(elCenterX - viewportCenterX);
        if (distance < closestDistance) {
          closest = el;
          closestDistance = distance;
        }
      });

      return closest;
    }

    function updateHighlight() {
      const centeredBook = getElementClosestToCenter(Array.from(books));
      if (centeredBook && centeredBook !== currentMostCentered) {
        if (currentMostCentered) {
          currentMostCentered.classList.remove('highlight-middle');
        }
        centeredBook.classList.add('highlight-middle');
        currentMostCentered = centeredBook;
      }
    }

    updateHighlight();

    let ticking = false;
    carousel.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateHighlight();
          ticking = false;
        });
        ticking = true;
      }
    });

    window.addEventListener('resize', updateHighlight);
  });

  // --- Edit goal toggle ---
  const editGoalBtn = document.getElementById('edit-goal-button');
  if (editGoalBtn) {
    editGoalBtn.addEventListener('click', function () {
      const goalForm = document.querySelector('.goal-form');
      if (goalForm) {
        goalForm.style.display = goalForm.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // --- Boek modal loader ---
  document.querySelectorAll('.book-container').forEach(book => {
    book.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      fetch(`/modal${href}`)
        .then(res => res.text())
        .then(html => {
          document.getElementById('modal-container').innerHTML = html;
          document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('modal-container').innerHTML = '';
          });
        });
    });
  });

  // --- Donut chart (progress ring) ---
  const progressCtx = document.getElementById('progressRing')?.getContext('2d');
  if (progressCtx) {
    const booksRead = parseInt(document.getElementById('progressRing').dataset.booksRead, 10);
    const goal = parseInt(document.getElementById('progressRing').dataset.goal, 10);
    const remaining = goal - booksRead;

    const donutData = {
      labels: ['Gelezen', 'Resterend'],
      datasets: [{
        label: 'Leesdoel',
        data: [booksRead, remaining > 0 ? remaining : 0],
        backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(201, 203, 207, 0.3)'],
        borderWidth: 1
      }]
    };

    const donutConfig = {
      type: 'doughnut',
      data: donutData,
      options: {
        cutout: '70%',
        animation: { animateRotate: true },
        plugins: { legend: { display: false } }
      },
      plugins: [
        {
          id: 'disableAnimationForSecondSegment',
          beforeDatasetDraw(chart, args) {
            const meta = chart.getDatasetMeta(args.index);
            meta.data.forEach((arc, index) => {
              if (index === 1) {
                arc.options.borderRadius = 0;
                arc.options.animation = {
                  animateRotate: false,
                  animateScale: false
                };
              }
            });
          }
        },
        {
          id: 'centerText',
          afterDraw(chart) {
            const { width, height, ctx } = chart;
            ctx.save();
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#4bc0c0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${booksRead}/${goal}`, width / 2, height / 2);
            ctx.restore();
          }
        }
      ]
    };

    new Chart(progressCtx, donutConfig);
  }

  // --- Genre bar chart ---
  const ctx = document.getElementById('genreChart').getContext('2d');
  const genreChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: window.genres,
      datasets: [{
        label: 'Top 5 genres',
        data: window.values,
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#333',
            font: { size: 14 }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }, // Voeg hier de komma toe
  });

  const ctxAuthors = document.getElementById('topAuthorsChart').getContext('2d');

  const topAuthorsChart = new Chart(ctxAuthors, {
    type: 'doughnut',
    data: {
      labels: window.topAuthorsNames,
      datasets: [{
        data: window.topAuthorsCounts,
        backgroundColor: [
          '#6c5ce7', '#00cec9', '#fab1a0', '#fd79a8', '#ffeaa7'
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Top 5 Schrijvers'
        }
      }
    }
  });
});
