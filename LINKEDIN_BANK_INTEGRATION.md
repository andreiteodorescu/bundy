# Bundy — secțiune LinkedIn: povestea integrării cu băncile

Text gata de copy-paste într-o postare / About / showcase. ~280 cuvinte.
Editează tonul/lungimea după preferință.

---

**Despre integrarea Bundy cu Open Banking — și de ce am renunțat**

Una dintre funcționalitățile pe care am vrut-o cel mai mult în Bundy era importul automat
al tranzacțiilor din bancă: deschizi aplicația, vezi cheltuielile săptămânii deja
categorizate, fără să fi tastat nimic.

Am încercat două integrări serioase:

**1. GoCardless Bank Account Data** (fost Nordigen) — am implementat tot flow-ul:
requisitions, consent PSD2, sincronizare zilnică prin cron. La signup pentru cont
de developer, m-au refuzat: nu mai acceptă utilizatori noi pentru API-ul standalone
de Account Data.

**2. Salt Edge** (alternativa cea mai mare din UE) — am rescris integrarea de la zero:
customers, connect sessions, webhooks, parse-uire tranzacții. Sandbox-ul a funcționat
perfect — am putut lista bănci, iniția conexiuni, primi callbacks. Dar pentru
**production access** au cerut entitate juridică (SRL/SA), reviewuri legale și
licențiere PSD2 / AISP. Pentru un app personal, e disproporționat.

**Concluzia mai amplă:** API-urile bancare în UE sunt construite în jurul
operatorilor reglementați (TPP licențiați). Persoanele fizice care vor să-și
acceseze automat propriile date bancare nu au cale legală directă — singura
opțiune e prin intermediari care, la rândul lor, cer status corporativ.

În plus, chiar și acolo unde aveam acces (sandbox), o problemă persista: **categorizarea
automată a tranzacțiilor**. Băncile întorc descrieri eterogene, "creditor name" diferă
masiv între MEGA IMAGE / Mega Image SRL / POS MEGA IMG, iar rules-engine-ul devine
fragil. Categorizarea precisă cere fie ML, fie input uman pe fiecare bancă în parte.

Am decis să renunț la feature. Codul rămâne în repo pentru viitor; UI-ul e scos
din bundle. Bundy rămâne tracker manual cu fluxuri rapide (Quick, Predefined, Fixed)
— mai puțin "magic", dar 100% al utilizatorului.

Învățarea cheie: **fii pregătit să arunci 3-4 zile de cod când reglementarea bate
tehnologia.** Și verifică termenii legali ÎNAINTE să arhitecturezi feature-ul.
