import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';
import { writeFile } from 'fs/promises';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns'; // npm i date-fns
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

// Verkrijg __dirname voor ES-modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Maak de app eerst aan
const app = new App();

const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

// Gebruik body-parser voor JSON en urlencoded requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Stel je template engine in
const engine = new Liquid({
  extname: '.liquid',
});


app.set('views', path.join(__dirname, 'views'));  // Dit geeft de locatie van de views-map aan
app.set('view engine', 'liquid');  // Stel Liquid in als je view-engine


app
  .use(logger())
  .use('/', sirv(process.env.NODE_ENV === 'development' ? 'client' : 'dist'))
  .listen(3000, () => console.log('Server available on http://localhost:3000'));


app.set('views', path.join(__dirname, 'views'));

// JSON bestand voor opslaan van planken
const shelvesFile = path.join(__dirname, 'shelves.json');

// Function to log book object structure for debugging
const logBookObject = (book) => {
  console.log('Book Object Structure:');
  console.log('ID:', book.id);
  console.log('Title:', book.title);
  console.log('Direct pageCount property:', book.pageCount);
  
  // If volumeInfo exists in the object, check there too
  if (book.volumeInfo) {
    console.log('Book has volumeInfo object');
    console.log('pageCount in volumeInfo:', book.volumeInfo.pageCount);
  } else {
    console.log('No volumeInfo object found');
  }
  
  // Log the entire object for inspection
  console.log('Full book object:', JSON.stringify(book, null, 2).substring(0, 500) + '...');
};

// Functie om de boekenplanken op te halen
const getShelves = () => {
  if (fs.existsSync(shelvesFile)) {
    const data = fs.readFileSync(shelvesFile);
    return JSON.parse(data);
  }
  return { currentlyReading: [], haveRead: [], toRead: [] };
};

// Functie om de boekenplanken bij te werken
const updateShelves = (shelves) => {
  fs.writeFileSync(shelvesFile, JSON.stringify(shelves, null, 2));
};

const fetchBooksFromGoogle = async (query) => {
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
    
    // Map the response to extract needed properties including pageCount
    if (response.data.items) {
      return response.data.items.map(item => {
        // Log the first item to see its structure
        if (response.data.items.indexOf(item) === 0) {
          console.log('First book from API:', JSON.stringify(item, null, 2).substring(0, 500) + '...');
        }
        
        return {
          id: item.id,
          title: item.volumeInfo?.title,
          authors: item.volumeInfo?.authors,
          thumbnail: item.volumeInfo?.imageLinks?.thumbnail,
          pageCount: item.volumeInfo?.pageCount || 0,
          genres: item.volumeInfo?.categories || [], // Voeg genres toe hier
          currentPage: 0
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
};

// // Route voor de homepage
// app.get('/', async (req, res) => {
//   const shelves = getShelves(); // Haal de planken op
//   const shelvesArray = Object.keys(shelves).map(shelfName => ({
//     name: shelfName,
//     books: shelfName === 'haveRead' ? [...shelves[shelfName]].reverse() : shelves[shelfName]
//   }));

//   // Voeg voortgang toe voor boeken op de "Currently Reading" plank
//   shelvesArray.forEach(shelf => {
//     if (shelf.name === 'currentlyReading') {
//       shelf.books = shelf.books.map(book => {
//         // Log the book object to debug
//         console.log('Book in currently reading shelf:', JSON.stringify(book, null, 2));
        
//         const currentPage = book.currentPage || 0;
//         const pageCount = book.pageCount || 1; // Use 1 as minimum to avoid division by zero
        
//         console.log(`Book: ${book.title}, Current Page: ${currentPage}, Page Count: ${pageCount}`);
        
//         // Calculate progress only if pageCount is valid
//         let progress = 0;
//         if (pageCount > 0) {
//           progress = (currentPage / pageCount) * 100;
//         }

//         return { 
//           ...book, 
//           progress: Math.round(progress) 
//         };
//       });
//     }
//   });
  

//   const shelfOptions = Object.keys(shelves); // Dit zijn de opties voor de dropdown
//   return res.send(engine.renderFileSync('server/views/index.liquid', {
//     title: 'Home',
//     shelves: shelvesArray, // Geef de planken als array door aan de template
//     shelfOptions: shelfOptions, // Geef de opties door
//   }));
// });


// Route voor de homepage
app.get('/', async (req, res) => {
  const shelves = getShelves(); // Haal de planken op
  const shelvesArray = Object.keys(shelves).map(shelfName => ({
    name: shelfName,
    books: shelfName === 'haveRead' ? [...shelves[shelfName]].reverse() : shelves[shelfName]
  }));

  // Voeg voortgang toe voor boeken op de "Currently Reading" plank
  shelvesArray.forEach(shelf => {
    if (shelf.name === 'currentlyReading') {
      shelf.books = shelf.books.map(book => {
        const currentPage = book.currentPage || 0;
        const pageCount = book.pageCount || 1; // Gebruik 1 als minimum om deling door nul te voorkomen
        
        let progress = 0;
        if (pageCount > 0) {
          progress = (currentPage / pageCount) * 100;
        }

        return { 
          ...book, 
          progress: Math.round(progress) 
        };
      });
    }
  });

  // Boek uitlezen per jaar
  let currentYear = new Date().getFullYear();
  let booksThisYear = 0;
  let goal = getGoal();

  // Itereren door boeken op de "haveRead" plank en het aantal boeken voor dit jaar tellen
  shelvesArray.forEach(shelf => {
    if (shelf.name === 'haveRead') {
      shelf.books.forEach(book => {
        const readYear = new Date(book.dateRead).getFullYear();
        if (readYear === currentYear) {
          booksThisYear++;
        }
      });
    }
  });

  // Bereken de voortgang in procenten
  let percentage = (booksThisYear / goal) * 100;

  // Plank opties voor de dropdown
  const shelfOptions = Object.keys(shelves);

  // Verzamel de genres en tel ze
  let genreCount = {};
  shelvesArray.forEach(shelf => {
    shelf.books.forEach(book => {
      if (book.genre) {
        book.genre.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;  // Tel de genres
        });
      }
    });
  });

  // --- Top 5 genres berekenen ---
  const genreCountMap = {};
  shelves.haveRead?.forEach(book => {
    if (book.genre) {
      book.genre.forEach(g => {
        genreCountMap[g] = (genreCountMap[g] || 0) + 1;
      });
    }
  });

  const topGenres = Object.entries(genreCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));


    // --- Top 5 auteurs berekenen ---
    const authorCounts = {};

    shelves.haveRead?.forEach(book => {
      if (book.authors) {
        const authors = Array.isArray(book.authors) ? book.authors : [book.authors];
        authors.forEach(author => {
          authorCounts[author] = (authorCounts[author] || 0) + 1;
        });
      }
    });
    
    const sortedAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

  // Geef de data door naar de Liquid template
  return res.send(engine.renderFileSync('server/views/index.liquid', {
    title: 'Home',
    shelves: shelvesArray, // Planken met boeken
    shelfOptions: shelfOptions, // Plank opties voor dropdown
    booksThisYear: booksThisYear, // Aantal boeken dit jaar
    goal: goal, // Jaardoel
    percentage: Math.round(percentage), // Percentuele voortgang
    updated_goal: req.query.updated_goal, // Dit kan je gebruiken voor bevestiging
    // 🔽 Voeg deze toe
    genres: topGenres.map(g => g.name),
    values: topGenres.map(g => g.count),
    topAuthorsNames: sortedAuthors.map(a => a[0]),
    topAuthorsCounts: sortedAuthors.map(a => a[1]),
    showStats: true,
  }));
});




const goalFile = path.join(__dirname, 'goal.json');

// Functie om het jaardoel op te halen
const getGoal = () => {
  if (fs.existsSync(goalFile)) {
    const data = fs.readFileSync(goalFile);
    return JSON.parse(data).goal || 12;  // Default naar 12 als het bestand leeg is of niet bestaat
  }
  return 12;  // Default als het bestand niet bestaat
};

// Functie om het jaardoel bij te werken
const updateGoal = (newGoal) => {
  const goalData = { goal: newGoal };
  fs.writeFileSync(goalFile, JSON.stringify(goalData, null, 2));
};

app.post('/update-goal', (req, res) => {
  const newGoal = parseInt(req.body.goal, 10);
  if (!isNaN(newGoal) && newGoal > 0) {
    updateGoal(newGoal);  // Update het jaardoel in goal.json
    console.log(`Nieuw jaardoel ingesteld: ${newGoal}`);
  } else {
    console.log('Ongeldige invoer voor jaardoel');
  }

  // Redirect terug naar de homepage om de nieuwe waarde te tonen
  res.redirect('/');
});


// Route voor het zoeken van boeken
app.get('/search', async (req, res) => {
  const query = req.query.q || 'JavaScript';
  const books = await fetchBooksFromGoogle(query);
  return res.send(engine.renderFileSync('server/views/index.liquid', {
    title: `Search Results for ${query}`,
    books: books,
    showStats: false
  }));
});

// app.post('/add-to-shelf', async (req, res) => {
//   const { book, shelf } = req.body;
//   const shelves = getShelves();

//   if (!shelves[shelf]) {
//     shelves[shelf] = [];
//   }

//   try {
//     // If only book.id is provided, fetch the complete book data
//     let bookData = book;
//     if (book.id && (!book.pageCount || book.pageCount === 0)) {
//       const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${book.id}`);
//       const apiBook = response.data;
      
//       // Log what we get from the API
//       console.log('API Book Data for pageCount:', apiBook.volumeInfo?.pageCount);
      
//       bookData = {
//         ...book,
//         pageCount: apiBook.volumeInfo?.pageCount || 0
//       };
//     }

//     // Create the book object to add to the shelf
//     const bookToAdd = {
//       id: bookData.id,
//       title: bookData.title,
//       authors: bookData.authors,
//       thumbnail: bookData.thumbnail || null,
//       pageCount: bookData.pageCount || 0,
//       currentPage: 0,
//     };

//     console.log('Adding book to shelf with pageCount:', bookToAdd.pageCount);

//     // Add the book to the selected shelf
//     shelves[shelf].push(bookToAdd);

//     // Update shelves in the file
//     updateShelves(shelves);

//     res.redirect('/');
//   } catch (error) {
//     console.error('Error adding book to shelf:', error);
//     res.status(500).send('Error adding book to shelf');
//   }
// });
app.post('/add-to-shelf', async (req, res) => {
  const { book, shelf } = req.body;
  const shelves = getShelves();

  if (!shelves[shelf]) {
    shelves[shelf] = [];
  }

  try {
    // Stap 1: haal eventueel ontbrekende gegevens op
    let bookData = book;
    if (book.id && (!book.pageCount || book.pageCount === 0)) {
      const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${book.id}`);
      const apiBook = response.data;

      bookData = {
        ...book,
        pageCount: apiBook.volumeInfo?.pageCount || 0,
        genre: apiBook.volumeInfo?.categories || [],  // Genre toevoegen
      };
    }

    // Stap 2: voeg dateRead toe als het naar 'haveRead' gaat
    if (shelf === 'haveRead') {
      bookData.dateRead = new Date().toISOString().split('T')[0];
    }

    // Stap 3: stel het boekobject samen
    const bookToAdd = {
      id: bookData.id,
      title: bookData.title,
      authors: bookData.authors,
      thumbnail: bookData.thumbnail,
      pageCount: bookData.pageCount || 0,
      currentPage: 0,
      genre: bookData.genre || [],
      dateRead: bookData.dateRead || null,
    };

    shelves[shelf].push(bookToAdd);
    updateShelves(shelves);

    res.redirect('/');
  } catch (error) {
    console.error('Error adding book to shelf:', error);
    res.status(500).send('Error adding book to shelf');
  }
});


// app.post('/move-book', (req, res) => {
//   const { book, fromShelf, toShelf } = req.body;
//   const shelves = getShelves();

//   if (!shelves[fromShelf]) {
//     console.error(`Shelf '${fromShelf}' bestaat niet.`);ßß
//     return res.status(400).send('Ongeldige plank');
//   }

//   // Verwijder boek uit huidige plank
//   shelves[fromShelf] = shelves[fromShelf].filter(b => b.id !== book.id);

//   // Voeg boek toe aan nieuwe plank
//   if (!shelves[toShelf]) {
//     shelves[toShelf] = [];
//   }

//   shelves[toShelf].push({
//     id: book.id,
//     title: book.title,
//     authors: book.authors,
//     thumbnail: book.thumbnail || null,
//     pageCount: book.pageCount || 0, // Ensure pageCount is included
//   });

//   updateShelves(shelves);
//   res.redirect('/');
// });
// app.post('/move-book', (req, res) => {
//   const { book, fromShelf, toShelf } = req.body;
//   const shelves = getShelves();

//   if (!shelves[fromShelf]) {
//     console.error(`Shelf '${fromShelf}' bestaat niet.`);
//     return res.status(400).send('Ongeldige plank');
//   }

//   // Verwijder boek uit huidige plank
//   shelves[fromShelf] = shelves[fromShelf].filter(b => b.id !== book.id);

//   // Voeg boek toe aan nieuwe plank
//   if (!shelves[toShelf]) {
//     shelves[toShelf] = [];
//   }

//   if (toShelf === 'haveRead') {
//     // Voeg de huidige datum toe als dateRead wanneer het boek naar "haveRead" wordt verplaatst
//     book.dateRead = new Date().toISOString().split('T')[0]; // Datum in formaat "YYYY-MM-DD"
//   }

//   shelves[toShelf].push({
//     id: book.id,
//     title: book.title,
//     authors: book.authors,
//     thumbnail: book.thumbnail || null,
//     pageCount: book.pageCount || 0, // Zorg dat pageCount altijd is ingevuld
//     dateRead: book.dateRead || null // Voeg dateRead toe als het bestaat
//   });

//   updateShelves(shelves);
//   res.redirect('/');
// });

app.post('/move-book', (req, res) => {
  const { book, fromShelf, toShelf } = req.body;
  const shelves = getShelves();

  if (!shelves[fromShelf]) {
    console.error(`Shelf '${fromShelf}' bestaat niet.`);
    return res.status(400).send('Ongeldige plank');
  }

  // Verwijder boek uit de huidige plank
  shelves[fromShelf] = shelves[fromShelf].filter(b => b.id !== book.id);

  if (toShelf === 'remove') {
    // Als de optie 'remove' geselecteerd is, verwijderen we het boek volledig
    console.log(`Boek '${book.title}' is verwijderd uit plank '${fromShelf}'.`);
    updateShelves(shelves); // Sla de gewijzigde planken op
    return res.redirect('/'); // Stuur de gebruiker terug naar de homepagina of overzicht
  }

  // Voeg boek toe aan de nieuwe plank als het geen 'remove' is
  if (!shelves[toShelf]) {
    shelves[toShelf] = [];
  }

  if (toShelf === 'haveRead') {
    // Voeg de huidige datum toe als dateRead wanneer het boek naar "haveRead" wordt verplaatst
    book.dateRead = new Date().toISOString().split('T')[0]; // Datum in formaat "YYYY-MM-DD"
  }

  shelves[toShelf].push({
    id: book.id,
    title: book.title,
    authors: book.authors,
    thumbnail: book.thumbnail || null,
    pageCount: book.pageCount || 0, // Zorg dat pageCount altijd is ingevuld
    dateRead: book.dateRead || null // Voeg dateRead toe als het bestaat
  });

  updateShelves(shelves); // Sla de gewijzigde planken op
  res.redirect('/'); // Stuur de gebruiker terug naar de homepagina of overzicht
});

app.get('/book/:id', async (req, res) => {
  const bookId = req.params.id;

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
    const bookData = response.data;
    
    // Log the response to see where pageCount is located
    console.log('Book API Response Structure:');
    console.log('pageCount in response:', bookData.volumeInfo?.pageCount);
    
    const book = {
      id: bookData.id,
      volumeInfo: {
        title: bookData.volumeInfo?.title,
        authors: bookData.volumeInfo?.authors,
        description: bookData.volumeInfo?.description,
        pageCount: bookData.volumeInfo?.pageCount || 0,
        imageLinks: bookData.volumeInfo?.imageLinks,
        // Include other properties you need
      }
    };

        // Zoek boeken van dezelfde auteur
        let similarBooks = [];
        if (book.volumeInfo.authors && book.volumeInfo.authors.length > 0) {
          const author = book.volumeInfo.authors[0]; // Neem de eerste auteur (als er meerdere zijn)
          const similarResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${author}&maxResults=10`);
          similarBooks = similarResponse.data.items || [];
        }

    const shelves = getShelves();
    let currentPage = 0;
    let shelfBook = null;

    // Look for the book in shelves and get currentPage
    for (const shelf of Object.values(shelves)) {
      const match = shelf.find(b => b.id === bookId);
      if (match) {
        shelfBook = match;
        currentPage = match.currentPage || 0;
        break;
      }
    }

    // If book exists in a shelf but doesn't have pageCount, update it
    if (shelfBook && (!shelfBook.pageCount || shelfBook.pageCount === 0)) {
      for (const shelfName of Object.keys(shelves)) {
        const index = shelves[shelfName].findIndex(b => b.id === bookId);
        if (index !== -1) {
          shelves[shelfName][index].pageCount = bookData.volumeInfo?.pageCount || 0;
          updateShelves(shelves);
          break;
        }
      }
    }

    res.send(engine.renderFileSync('server/views/detail.liquid', {
      title: `Detailpagina voor ${book.volumeInfo.title}`,
      book: book,
      currentPage: currentPage,
      shelfOptions: ['currentlyReading', 'haveRead', 'toRead'], // ✅ voeg deze toe
      shelf: getShelfName(shelves, bookId), // ✅ dit gaan we hieronder uitleggen
      similarBooks: similarBooks // Voeg de vergelijkbare boeken toe aan de view
    }));
  } catch (error) {
    console.error('Fout bij ophalen boekgegevens:', error);
    res.status(500).send('Fout bij ophalen boekdetails');
  }
});

function getShelfName(shelves, bookId) {
  for (const [shelfName, books] of Object.entries(shelves)) {
    if (books.find(book => book.id === bookId)) {
      return shelfName;
    }
  }
  return null;
}

app.post('/update-progress', (req, res) => {
  const { id, currentPage } = req.body;
  const shelves = getShelves();

  let bookMoved = false;

  for (const shelfName of Object.keys(shelves)) {
    const index = shelves[shelfName].findIndex(b => b.id === id);
    if (index !== -1) {
      // Update de pagina van het boek
      shelves[shelfName][index].currentPage = parseInt(currentPage);
      console.log('Book after updating current page:', shelves[shelfName][index]);

    // Voeg de huidige datum toe als dateRead wanneer het boek naar "haveRead" wordt verplaatst
    if (parseInt(currentPage) >= shelves[shelfName][index].pageCount && shelves[shelfName][index].pageCount > 0) {
      // Verwijder boek van de huidige plank
      const bookToMove = shelves[shelfName].splice(index, 1)[0];

      // Voeg de huidige datum toe als dateRead
      bookToMove.dateRead = new Date().toISOString().split('T')[0]; // Datum in formaat "YYYY-MM-DD"

      // Voeg het boek toe aan de 'haveRead' plank
      if (!shelves.haveRead) {
        shelves.haveRead = [];
      }
      shelves.haveRead.push(bookToMove);

      bookMoved = true;
    }

      updateShelves(shelves); // Update de planken
      break;
    }
  }

  // Redirect naar de detailpagina van het boek
  res.redirect(`/book/${id}`);
});

const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    ...data
  };

  return engine.renderFileSync(template, templateData);
};


app.get('/modal/book/:id', async (req, res) => {
  const id = req.params.id;
  const shelves = getShelves(); // Haal de planken op
  const allBooks = Object.values(shelves).flat();
  const selectedBook = allBooks.find(b => b.id === id);

  if (!selectedBook) {
    return res.status(404).send('Boek niet gevonden');
  }

  // Haal de huidige plank op waar het boek zich bevindt
  const shelfName = Object.keys(shelves).find(shelf => shelves[shelf].includes(selectedBook));

  // Zorg dat je shelfOptions hebt
  const shelfOptions = Object.keys(shelves);

  try {
    const html = await engine.renderFile(path.join(__dirname, 'views', 'partials', 'bookModal.liquid'), {
      book: selectedBook,
      shelf: { name: shelfName },  // Voeg de huidige plank toe
      shelfOptions: shelfOptions,  // Voeg de mogelijke planken toe
    });
    res.send(html);
  } catch (err) {
    console.error('Renderfout in modal:', err);
    res.status(500).send('Fout bij laden modal');
  }
});