# PHM All Stars

Web pro Jonášův výběr měsíčního All Stars týmu: 3 útočníci, 2 obránci a 1 brankář.

Veřejná adresa: https://wendaar.github.io/PHM-All-Stars-generator/

## Data a výběr

Výchozí zdroj je pevný HMS snímek k 2. 10. 2026 z Google Sheetu
„Chat GPT - HMS exporty 2027 PHM“, včetně Goalies a Groups. Není průběžně synchronizovaný.
Po výslovné dohodě se všech 103 dokončených zápasů přiděluje září: 99 zářijových
a 4 zápasy jednoho říjnového hracího dne. Výjimka je uložená i v exportech.

Zvolte měsíc a divizi, projděte shortlist a označte finálních šest hráčů.
Pozice jsou preferované z Players; detaily zápasů se nescrapují.
Hráči bez rozpoznané pozice se nabízejí v útoku i obraně, s označením „pozice
neověřena“ a bez snížení skóre. Každý hráč za každý tým má samostatnou nominaci,
statistiky a podíl zápasů; různé týmy se nesčítají. Stejnou nominaci za stejný
tým nelze vybrat současně do útoku i obrany. Nejasné statistiky jsou uvedené pod nominacemi.
Výběr je uložený v prohlížeči; přenáší se pomocí JSON sestavy.
PNG funguje pro článek i sítě, HTML/iframe obsahuje sestavu přímo v kódu.
Ukázková data jsou samostatné označené demo se smyšlenými hráči.

Další HMS export stáhněte jako XLSX k **31. 10. 2026**, importujte jako průběžné
součty sezony 2026-2027, měsíc 2026-10, uzávěrka 2026-10-31.
Aplikace odečte snímek z 2. října, aby se první říjnový hrací den nepočítal dvakrát.
Chybějící předchozí řádky a záporné přírůstky vyžadují kontrolu.

## Soubory

- index.html, styles.css, app.js: ovládání a stav aplikace
- domain.js: normalizace HMS, měsíční přírůstky a shortlist
- graphics.js: infografika, PNG a HTML/iframe
- data/2026-09.json: snímek sportovních dat bez kontaktních údajů
- assets/: PHM pozadí a veřejné obrázky známé ze zářijového exportu
- assets/media-map.json: lokální kopie pro PNG, protože HMS server blokuje CORS
- vendor/: SheetJS CE 0.20.3, Apache-2.0
- test/: ověření importu a nominačních pravidel

Nové obrázky z dalších XLSX importů se v náhledu načítají z HMS. PNG je při
omezení CORS nahradí iniciálami/textem a oznámí, které chybějí. Pro plný export
nových obrázků je nutné aktualizovat přibalené obrázky.

## Spuštění a publikace

Vyžaduje Node.js 20 nebo novější; instalace balíčků není nutná.

    node serve.js
    node --test

GitHub Pages publikuje větev main a její kořenovou složku. Žádný build není potřeba.
Původní dva PHM background soubory v kořeni jsou zachované.
