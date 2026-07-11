# Pedagogický audit textů — Šachový průvodce

Audit provedený nad `src/data/openings.ts` (9 zahájení, 28 variant),
`src/data/games.ts` (14 partií) a `src/data/pieces.ts` (6 figur).
Hodnoceno podle kritérií: (1) vysvětluje „proč", (2) srozumitelnost pro
cílovku, (3) návaznost příběhu, (4) konzistence, (5) faktická opatrnost.

---

## 1. Souhrnné hodnocení

Celkový stav je **dobrý až velmi dobrý** — aplikace nemá žádnou položku,
která by látku popisovala nedostatečně (žádné C). Texty mají jednotný hlas
(věcný, přátelský, česky), notace J/S/V/D/K je důsledná, klíčové momenty
(charakteristický tah, past, zlom) jsou skoro všude zvýrazněné. Novější
obsah je znatelně silnější: Caro-Kann, Skandinávská, Petrov a Královská
indická vyprávějí souvislý příběh s plány obou stran („Hlavní výhoda oproti
Francouzské…", „Hned 3...Jxe4? 4.De2! je známá past") a stejně kvalitní jsou
slavné partie i pasti. Režim Figury je stručný a pedagogicky přesný.

Slabiny jsou dvojího druhu. Za prvé **nerovnoměrná hloubka mezi vlnami
obsahu**: u pěti původních zahájení (Italská, Londýn, Francouzská, Sicilská,
Dámský gambit) část komentářů jen popisuje, co hráč vidí sám („Bílý rozvíjí
střelce na aktivní pole", „Černý dokončuje rozvoj"), a řada variant končí
stejnou formulí „Vyrovnaná pozice / vyrovnané šance" bez náznaku, oč se
bude hrát dál. Nejslabší je varianta Anti-London, kde je generických
komentářů většina. Za druhé **několik bodových kazů**: jedna faktická chyba
ve jméně velmistra, dva zmatené komentáře (čtou se jako nedokončená úvaha)
a chybějící zmínka o braní mimochodem u pěšce.

Nic z toho nebrání používání aplikace — jde o cílené dotažení, ne o plošný
přepis. Doporučené úpravy níže jsou seřazené podle přínosu pro učení;
body 1–2 považuji za jednoznačně užitečné, body 3–5 za volitelné zlepšení.

---

## 2. Tabulka hodnocení

| Položka | Známka | Poznámka |
|---|---|---|
| Italská hra (4 varianty) | B | jádro výborné; konce variant generické, vágní „neslušná" u 4. Jg5 |
| Londýnský systém (3 varianty) | B | main + Jobava dobré; **chybné jméno „Bagi Jobava"**; Anti-London povrchní |
| Francouzská obrana (4 varianty) | B | advance výborná; classical/tarrasch mají generické pasáže |
| Sicilská obrana (4 varianty) | B | dragon/sveshnikov výborné; najdorf má hluchá místa uprostřed |
| Dámský gambit (4 varianty) | B | slav dobrá; accepted/declined místy popisné bez „proč" |
| Caro-Kannova obrana (2 varianty) | A | vzorové — srovnání s Francouzskou jako červená nit |
| Skandinávská obrana (2 varianty) | A | jasné plány, vysvětluje porušení pravidla o dámě |
| Ruská obrana — Petrov (2 varianty) | A | výborné varování před pastí 3...Jxe4? |
| Královská indická (3 varianty) | A | nejlepší vyprávění v souboru (závod na křídlech) |
| Partie — klasické 4 (Légal, Pastýřský, Opera, Fegatello) | A | přesné, návodné |
| Partie — slavné 4 (Immortal, Evergreen, Century, Réti) | A | silné vyprávění, fakticky v pořádku |
| Partie — pasti 6 | B | výborná pedagogika; **dva zmatené komentáře v Laskerově pasti (7. Ke2 a 8. Ke1)** |
| Figury (6 karet) | B | texty výborné; **u pěšce chybí braní mimochodem** |

---

## 3. Konkrétní nálezy (položky se známkou B)

### 3.1 Londýnský systém — faktická chyba + povrchní Anti-London

**(a) Chybné jméno velmistra** (kritérium 5) — description Jobava London:

> „Pojmenováno po gruzínském velmistru **Bagi Jobavovi**."

Velmistr se jmenuje **Baadur Jobava**. Návrh: „…po gruzínském velmistru
Baaduru Jobavovi."

**(b) Anti-London — komentáře bez „proč"** (kritérium 1). Příklady:

> „1... Jf6 — Standardní rozvojový tah jezdce."
> „10... Db8 — Černá dáma na b8 — chystá tlak ve sloupci b."
> „11. Vd1 — Bílý aktivuje věž na centrální sloupec d."

Varianta je z pohledu černého („aktivní reakce na Londýn"), ale komentáře
tento úhel nedrží — nikde se nevysvětluje, proč právě výměna na d4 a hra po
sloupci c Londýn nepříjemně obchází (střelec f4 zůstává bez cíle, černý
dostane poloviční sloupec b/c). Návrh: ~8–10 komentářů přepsat tak, aby
sledovaly plán černého, např. u 2...c5: „Anti-London! Černý udeří na d4
dřív, než bílý stihne postavit pyramidu c3-d4-e3 — přesně té se chce
vyhnout."

### 3.2 Pasti — zmatený komentář v Laskerově pasti, tah 8. Ke1 (kritérium 2 a 5)

Tah 8. Ke1:

> „Král se vrací — jezdce g1 vzít nemůže **(chrání ho věž h8? ne — je to
> šach, král musí reagovat)**."

Závorka se čte jako nedokončená úvaha a věcně je zavádějící (věž h8 jezdce
g1 nechrání; král z e2 na g1 prostě nedosáhne). Návrh: „Král ustupuje —
šachujícího jezdce z e2 nedosáhne a věž h1 ho vzít nemůže, dokud je král
v šachu."


### 3.3 Pasti — zmatený komentář v Laskerově pasti, tah 7. Ke2 (kritérium 2)

Tah 7. Ke2:

> „Král musí vzít? Ne — **fxg1=D by bylo s věží v rohu.** Král jde na e2."

Věta „s věží v rohu" nedává začátečníkovi smysl (a míchá dohromady dva
tahy). Pointa je jiná: po 7. Kxf2?? přijde ostrý útok černého, proto král
raději uhne. Návrh: „Vzít pěšce se bílému nechce — po Kxf2 by přišel útok
s tempem (Dh4+ visí ve vzduchu). Král proto uhýbá na e2."

### 3.4 Figury — pěšci chybí braní mimochodem (kritérium 4 — úplnost)

Karta pěšce popisuje pohyb, braní i proměnu, ale **vůbec nezmiňuje braní
mimochodem (en passant)** — přitom engine ho podporuje a je to pravidlo,
které začátečníky zaskočí nejčastěji. Návrh: doplnit jednu větu do
`movement`: „Zvláštnost: přeskočí-li soupeřův pěšec dvojkrokem pole, které
napadáš, smíš ho hned dalším tahem vzít „mimochodem" (en passant)."

### 3.5 Stará vlna zahájení — generické komentáře a stejné konce
(Italská, Francouzská, Sicilská, Dámský gambit; kritéria 1 a 3)

Typické příklady:

> Najdorf, 10. Se3: „Bílý rozvíjí střelce na centrální pole."
> Francouzská classical, 12. De2: „Bílá dáma na centrální pole, podpora plánů."
> Dámský gambit accepted, 11...Jd7: „Černý dokončuje rozvoj všech figur."

A opakující se závěr variant (vyskytuje se ~10×):

> „…Vyrovnaná pozice s aktivní hrou." / „Pozice s vyrovnanými šancemi."

Návrh: bodově přepsat jen nejprázdnější komentáře (odhadem 25–35 z ~640)
na „proč"-formulace a každé variantě dát závěrečný komentář s výhledem
(„Bílý bude hrát na …, černý na …"), po vzoru Královské indické
(„Lavina se valí! … závod na opačných křídlech").

### 3.6 Drobnosti (kritéria 2 a 4)

- Italská, Útok dvou jezdců, 4. Jg5: „Některé teorie ji považují za
  ‚neslušnou'." — vágní; buď konkrétně (Tarrasch tah kritizoval jako
  „tah packalů", přesto je plně korektní), nebo vypustit.
- Anglicismy v jinak české terminologii: „Orthodox setup" (Dámský gambit,
  6. Jf3), „typický Drak setup" (Sicilská, 10...Vc8). Návrh: „ortodoxní
  postavení", „typické postavení Draka".
- Pojmy **tempo** a **vazba** se používají často, ale nikde nejsou při
  prvním výskytu vysvětleny v zahájeních pro začátečníky (v partiích ano —
  Sloní past vazbu vysvětluje pěkně). Návrh: mini-vysvětlení v 1. výskytu
  u Italské a Londýna (dohromady ~4 komentáře).

### 3.7 Mimo rozsah textových úprav (jen k vědomí)

Dvě varianty jsou výrazně kratší než ostatní: Francouzská — Výměnná
(10 půltahů) a Dámský gambit — Tarraschova obrana (10 půltahů) vs. 22–28
jinde. Vyrovnání by vyžadovalo **nové tahy, což je zakázáno** — nechávám
bez doporučení; případně lze jen o větu rozšířit description, aby krátkost
působila záměrně („krátká varianta na pochopení struktury").

---

## 4. Doporučení seřazená podle přínosu

| # | Úprava | Přínos | Rozsah |
|---|---|---|---|
| 1 | Opravit faktické/matoucí kazy: jméno Jobava (3.1a), Laskerova past 8. Ke1 (3.2) a 7. Ke2 (3.3) | vysoký — odstraní chyby, které aktivně matou | 3 komentáře + 1 description |
| 2 | Doplnit braní mimochodem ke kartě pěšce (3.4) | vysoký — chybějící pravidlo | 1 věta |
| 3 | Prohloubit Anti-London (3.1b) | střední — nejslabší varianta v aplikaci | ~8–10 komentářů |
| 4 | Bodové „proč"-přepisy nejprázdnějších komentářů staré vlny + závěry variant s výhledem (3.5) | střední — srovná hloubku napříč aplikací | ~25–35 komentářů |
| 5 | Drobnosti: „neslušná", anglicismy, mini-vysvětlení tempa a vazby (3.6) | nižší — polish | ~8 textů |

Žádná položka není C — aplikace funguje i beze změn. Pokud se má dělat
jen minimum, doporučuji body **1 a 2** (čtyři malé, jednoznačné opravy).
