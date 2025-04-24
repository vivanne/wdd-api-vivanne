# 📚 Google Books – Shelves Webapp

### _Vivanne Hoogendam_

Een webapp die boekenplanken toont op basis van de **Google Books API**. Gebruikers kunnen boeken bekijken per plank (zoals 'haveRead', 'Nog te lezen' en 'currentlyReading').

---

## 🔧 Functionaliteiten

- ✅ Boeken ophalen via de Google Books API
- 📘 Per plank meerdere boeken tonen (titel, auteur, thumbnail)
- 🔍 Zoekfunctie integratie
- 🧠 Eenvoudige UX met overzichtelijke weergave
- 📁 Structuur voor eigen boekenlijsten
- 🎯 Jaarlijks leesdoel kunnen instellen
- 📊 Lees statistieken kunnen inzien

---

## Weekvoortgang

---

### 📅 Week 1

**✅To Do**

- [x] Opzetje maken
- [x] API uitkiezen
- [x] API koppelen
- [x] Planken uit API halen

**Voortgang**

Deze week ben ik begonnen met het opzetten van mijn project. Helaas kon ik alleen niet bij de eerste lessen zijn op maandag en dinsdag, waardoor ik wat belangrijke informatie heb gemist.

Ik was van start gegaan met het opzetten van een express app. Ik had dus niet de repo die gecloned kon worden gezien nog, aangezien ik tijdelijk niet in Teams kwam.

![Oude project](/eersteproject.png)

Dit is hoe mijn oude project eruit zag. Hierin had ik mijn webapp gekoppeld aan mijn google inlog. In eerste instantie dacht ik er niet veel van, maar na het feedback gesprek met Declan kreeg ik snel te horen dat dit niet de juiste manier was, waardoor ik eigenlijk veel tijd kwijt was.

Ik moest het aanpassen naar:

- tinyhttp
- zoveel mogelijk serverside
- zonder koppeling aan google account, maar alleen de api. Dit zou betekenen dat ik zelf de shelves in de backend moest gaan aanmaken ipv ze met een id uit m'n google account te halen.

---

### 📅 Week 2

**✅To Do**

- [x] Repo clonen
- [x] Project ombouwen
- [x] api ophalen
- [x] Shelves in json aanmaken
- [x] search route
- [x] begin maken aan carousel stijling
- [x] add-to-shelf
- [x] move-book
- [x] css bug oplossen
- [ ] Web API's bedenken voor volgende week

**Voortgang**

Deze hele week ben ik bezig geweest met het ombouwen van wat ik eigenlijk al had. Wat vorige week heel simpel ging, was nu opeens wat ingewikkelder in mijn ogen. Wel had ik het redelijk snel kunnen fixen. Aan het eind van de week had ik een aparte json file kunnen opzetten voor de verschillende boekenplanken:

![shelves.json](/foto-shelvesjson.png)

Ook heb ik een search route kunnen instellen:

```js
// Route voor het zoeken van boeken
app.get("/search", async (req, res) => {
  const query = req.query.q || "JavaScript";
  const books = await fetchBooksFromGoogle(query);
  return res.send(
    engine.renderFileSync("server/views/index.liquid", {
      title: `Search Results for ${query}`,
      books: books,
      showStats: false,
    })
  );
});
```

En bij die zoekresultaten heb ik deze week ook al een select met options erin gezet met waar je het boek aan toe zou willen voegen:

```html
<form action="/add-to-shelf" method="POST" class="add-to-shelf-form">
  <input type="hidden" name="book[id]" value="{{ book.id }}" />
  <input type="hidden" name="book[title]" value="{{ book.title }}" />
  <input
    type="hidden"
    name="book[authors]"
    value="{{ book.authors | join: ', ' }}"
  />
  {% if book.thumbnail %}
  <input type="hidden" name="book[thumbnail]" value="{{ book.thumbnail }}" />
  {% endif %} {% if book.pageCount %}
  <input type="hidden" name="book[pageCount]" value="{{ book.pageCount }}" />
  {% endif %}
  <input type="hidden" name="book[currentPage]" value="0" />
  <input
    type="hidden"
    name="book[genre]"
    value="{{ book.categories | join: ', ' }}"
  />

  <select name="shelf" required>
    <option value="currentlyReading">Currently Reading</option>
    <option value="haveRead">Have Read</option>
    <option value="toRead">To Read</option>
  </select>

  <button type="submit" class="add-to-shelf-button">Voeg toe aan plank</button>
</form>
```

Deze moest wel anders zijn dan de /move-book route. Bij movebook staat hij al in een plank, waardoor je de current shelve erbij moest rekenen + een verwijder optie. Daar heb ik dus eeen aparte route voor gemaakt.

Aan het einde van de week had ik een javascriopt koppeling bug. Ik moest nog een beetje wennen aan de map structuur dus had nog niet helemaal door dat er overal vanalles was gelinkt aan elkaar. Waardoor ik na het kopieren van wat code uit AI, perongeluk een linkje had verwijderd die de javascript koppeling had verwijderd, zonder dat ik dit doorhad. Heb er uiteindelijk een uur over gedaan om dit op te lossen met hulp.

Na het feedback gesprek zijn we tot de conclusie gekomen dat ik de basis functionaliteit opzich wel heb staan, en dus even moet gaan focussen op de UI. Dit was totaal nog niet aan de orde gekomen in mijn hoofd. Dit vond ik een mooie taak voor volgende week!

Wel heb ik wat ideeën opgedaan uit m'n feedbackgesprek met Cid:

1. 3D boeken, alsof ze echt op een plank staan met de spine naar voren
2. jaardoel misschien voor het laatst laten
3. In de detail pagina meer boeken tonen van die schrijver/genre

---

### 📅 Week 3

**✅To Do**

- [x] Pagina vordering
- [x] 3D boeken
- [ ] Canva web api voor dominante kleur?
- [ ] jaarlijks leesdoel instellen

**Voortgang**

Ik heb een systeempje kunnen bouwen waarbij je kan bijhouden op welke pagina van het boek je bent. Hij pakt van het boek de bekende pageCount en currentPage (die bij het toevoegen van ee nboek aan een shelve wordt toegevoegd als 0) deelt die door elkaar, keer 100 waaruit je een procent krijgt. Waarna hij een progressbar update.

```html
{% if shelf == "currentlyReading" and book.volumeInfo.pageCount %}
<form action="/update-progress" method="POST">
  <input type="hidden" name="id" value="{{ book.id }}" />
  <label for="currentPage">Huidige pagina:</label>
  <input
    type="number"
    name="currentPage"
    min="0"
    max="{{ book.volumeInfo.pageCount }}"
    value="{{ currentPage }}"
  />
  <button type="submit" class="update-page">Opslaan</button>
</form>

{% assign totalPages = book.volumeInfo.pageCount %}
<p>
  Je hebt {{ currentPage }} van de {{ totalPages }} pagina's gelezen ({{
  currentPage | divided_by: totalPages | times: 100.0 | round }}%).
</p>
<progress value="{{ currentPage }}" max="{{ totalPages }}"></progress>
{% endif %}
```

Na wat bugs te hebben moeten oplossen, en daar een halve dag mee bezig geweest te zijn naar m'n gevoel (hij wilde de pageCount niet pakken.. Ik weet niet meer wat er fout was), ben ik doorgegaan met wat styling. De boeken 3D maken was mijn volgende taakje. Dat is gelukt!

![3d boeken](/3dboeken.png)

Ik ben erachter gekomen dat Canva hem niet gaat worden voor de dominante kleur. De google books api heeft een regel (COURSE, als ik het goed heb), die niet toestaat dat je de afbeeldingen/thumbnails 'leest'. Waardoor de pixel kleuren dus niet opgehaald kunnen worden. Heel jammer.

Na het feedback gesprek met Declan deze week zijn de volgende punten eruit gekomen:

1. Verander meerdere planken naar 3d ipv elke keer aparte stijling
2. Laat de infinite scroll eruit, dit brengt alleen maar gedoe en is niet user friendly
3. Verbeter de UI
4. Bouw een popup voor als je op boek klikt ipv meteen naar detail pagina

---

### 📅 Week 4

**✅To Do**

- [x] Final touches & bugfixes
- [x] Web api chart.js
- [x] De hele front end moet nog gefixt
- [x] jaardoel afmaken
- [x] Live zetten
- [x] alle files kopieren naar eigen repo 👀

**Voortgang**

Deze week was veel puntjes op de I zetten. Ik kwam nog veel bugs/ux dingen tegen die verbeterd moesten worden. Bijvoorbeeld bij de search linkte de boeken nog niet naar een detail pagina. Sommige forms werkte weer niet. De CSS lag er weer een keer uit.

Daarnaast moest ik de hele webAPI nog bijvoegen. Hiervoor had ik bedacht dat ik wat statistieken wilde laten zien op de index.liquid.

![3d boeken](/stats.png)

## Als ik meer tijd had

1. Meer statistieken
2. Per dag kunnen invullen of je hebt gelezen -> soort streaks opbouwen
3. popup uitgebreider gemaakt/ gestijld
4. search uitgebreider maken
5. spine kleur gebaseerd op dominante lkeur van thumbnail
