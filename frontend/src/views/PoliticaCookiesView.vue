<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-8">
    <h1 class="titol-pantalla">Política de cookies</h1>
    <p class="mt-2 text-base-content/80">
      <time datetime="2026-11-15">15 de novembre de 2026</time>
    </p>

    <section class="mt-8 space-y-3" aria-labelledby="que-son">
      <h2 id="que-son" class="text-xl font-semibold">Què són les cookies i les tecnologies similars</h2>
      <p>
        Les cookies són fitxers que un lloc pot desar al teu aparell. La llei tracta de la mateixa manera altres
        tecnologies que desen o llegeixen informació al dispositiu, com l’emmagatzematge local del navegador o la
        memòria cau de l’aplicació. En català, de les cookies també se’n diu galetes.
      </p>
      <p>Espais no fa servir galetes HTTP. Fa servir les tecnologies d’aquesta pàgina, totes pròpies.</p>
    </section>

    <section class="mt-8 space-y-3" aria-labelledby="qui-informa">
      <h2 id="qui-informa" class="text-xl font-semibold">Qui informa</h2>
      <p>
        El peu de pàgina identifica Eduard Farinyes. A l’aplicació no hi ha publicats ni una adreça postal, ni un NIF,
        ni un correu de contacte. Tampoc no hi ha una política de privacitat a part d’aquesta pàgina.
      </p>
    </section>

    <section class="mt-8 space-y-6" aria-labelledby="que-fa-servir">
      <h2 id="que-fa-servir" class="text-xl font-semibold">Quines tecnologies fa servir Espais</h2>

      <article aria-labelledby="tec-mode">
        <h3 id="tec-mode" class="text-lg font-semibold">espais.mode</h3>
        <dl class="mt-2 space-y-2">
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Tecnologia</dt>
            <dd>Emmagatzematge local del navegador.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Finalitat</dt>
            <dd>
              Recordar si la pantalla és clara o fosca. A la primera visita es desa el valor «clar». Si prems Clar o
              Fosc, es desa l’opció que has triat.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">De qui és</dt>
            <dd>Pròpia d’Espais.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Durada</dt>
            <dd>Fins que canvies el mode o esborres les dades d’aquest lloc. No té data de caducitat.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Règim</dt>
            <dd>
              Exempta de consentiment. Serveix només per a l’aspecte de la pantalla. No es fa servir per mesurar
              visites ni per publicitat.
            </dd>
          </div>
        </dl>
      </article>

      <article aria-labelledby="tec-aparenca">
        <h3 id="tec-aparenca" class="text-lg font-semibold">espais.aparenca</h3>
        <dl class="mt-2 space-y-2">
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Tecnologia</dt>
            <dd>Emmagatzematge local del navegador.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Finalitat</dt>
            <dd>
              Clau antiga. Si el navegador encara la té, Espais només la llegeix per recuperar el mode i passa a fer
              servir espais.mode. L’aplicació actual no l’escriu.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">De qui és</dt>
            <dd>Pròpia d’Espais.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Durada</dt>
            <dd>La que ja tingui al navegador, fins que esborres les dades del lloc.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Règim</dt>
            <dd>Exempta de consentiment. La finalitat és la mateixa que la del mode de pantalla.</dd>
          </div>
        </dl>
      </article>

      <article aria-labelledby="tec-sessio">
        <h3 id="tec-sessio" class="text-lg font-semibold">espais.sessio</h3>
        <dl class="mt-2 space-y-2">
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Tecnologia</dt>
            <dd>Emmagatzematge local del navegador. Només s’escriu quan entres.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Finalitat</dt>
            <dd>
              Mantenir la sessió. Conté el codi de sessió, l’identificador i el nom de l’entitat, el nom de la persona,
              el rol, el tipus d’entitat si n’hi ha, i els colors de l’entitat. No conté la contrasenya ni el correu. El
              codi de sessió s’envia a l’aplicació en una capçalera d’autorització, no com a cookie.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">De qui és</dt>
            <dd>Pròpia d’Espais.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Durada</dt>
            <dd>
              El codi de sessió és vàlid 7 dies. El registre es queda al navegador fins que prems Surt, fins que el
              servidor rebutja la sessió, o fins que esborres les dades del lloc. Surt revoca el codi al servidor.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Règim</dt>
            <dd>
              Exempta de consentiment. És necessària per prestar el servei que demanes en entrar. No es fa servir per a
              cap altra finalitat.
            </dd>
          </div>
        </dl>
        <p class="mt-2">
          El nom de la persona i el de l’entitat són dades personals. Espais no publica, en una política de privacitat,
          la informació de l’article 13 del Reglament general de protecció de dades: la base jurídica, els drets i un
          contacte.
        </p>
      </article>

      <article aria-labelledby="tec-cau">
        <h3 id="tec-cau" class="text-lg font-semibold">Memòria de l’aplicació</h3>
        <dl class="mt-2 space-y-2">
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Tecnologia</dt>
            <dd>Memòria cau del navegador, a través del service worker de l’aplicació.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Finalitat</dt>
            <dd>
              Desar una còpia dels fitxers d’Espais (codi, estils, HTML, icones i manifest) per poder obrir l’aplicació
              i actualitzar-la. No registra per on navegues.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">De qui és</dt>
            <dd>Pròpia d’Espais.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Durada</dt>
            <dd>
              Fins que l’aplicació actualitza aquesta còpia o esborres les dades del lloc. No té una caducitat fixa en
              dies.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Règim</dt>
            <dd>Exempta de consentiment. És tècnica i només serveix per fer funcionar l’aplicació.</dd>
          </div>
        </dl>
      </article>

      <article aria-labelledby="tec-avis">
        <h3 id="tec-avis" class="text-lg font-semibold">espais.avis-cookies</h3>
        <dl class="mt-2 space-y-2">
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Tecnologia</dt>
            <dd>Emmagatzematge local del navegador. Només s’escriu quan tanques l’avís.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Finalitat</dt>
            <dd>
              Recordar que has tancat l’avís, per no tornar-lo a mostrar. El valor és «tancat». No és una acceptació de
              cookies.
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">De qui és</dt>
            <dd>Pròpia d’Espais.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Durada</dt>
            <dd>Fins que esborres les dades del lloc.</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <dt class="font-semibold">Règim</dt>
            <dd>Exempta de consentiment. Només recorda el tancament de l’avís.</dd>
          </div>
        </dl>
      </article>
    </section>

    <section class="mt-8 space-y-3" aria-labelledby="que-no">
      <h2 id="que-no" class="text-xl font-semibold">Què no fa servir</h2>
      <p>
        Espais no fa servir cookies de tercers, analítica, publicitat, xarxes socials, vídeos incrustats ni lletres
        descarregades d’un altre servidor. La lletra Montserrat va amb l’aplicació. No fa servir l’emmagatzematge de
        sessió del navegador. No elabora perfils de navegació ni pren decisions automatitzades a partir d’aquestes
        tecnologies. No transfereix, per aquesta via, dades a tercers països.
      </p>
    </section>

    <section class="mt-8 space-y-3" aria-labelledby="per-que">
      <h2 id="per-que" class="text-xl font-semibold">Per què no et demanem consentiment</h2>
      <p>
        L’article 22.2 de la Llei 34/2002, de serveis de la societat de la informació, exigeix consentiment per desar o
        llegir informació al dispositiu, excepte quan això és tècnic i només serveix per transmetre una comunicació o
        per prestar un servei que has demanat. La guia de l’Agència Espanyola de Protecció de Dades de maig de 2024
        inclou en aquesta excepció la sessió que demanes en entrar i la personalització de la interfície. El mode per
        defecte no es dedueix de cap dada teva i no té cap altra finalitat.
      </p>
      <p>
        Com que Espais només fa servir tecnologies d’aquest grup, l’avís informa i es pot tancar. No hi ha botó
        d’acceptar ni de rebutjar, perquè no hi ha res que hagis d’autoritzar. Tancar l’avís no és un consentiment. La
        guia recomana informar també de les tecnologies exemptes; aquesta pàgina ho fa.
      </p>
      <p>
        La renovació del consentiment, com a màxim cada 24 mesos segons la mateixa guia, no s’aplica: no hi ha
        consentiment per renovar.
      </p>
    </section>

    <section class="mt-8 space-y-3" aria-labelledby="com-gestionar">
      <h2 id="com-gestionar" class="text-xl font-semibold">Com ho pots gestionar</h2>
      <ul class="list-disc space-y-2 pl-5">
        <li>
          Mode clar o fosc: botons Clar i Fosc del capçal. A la pàgina d’inici es veuen en pantalles grans; amb la
          sessió iniciada, també al telèfon.
        </li>
        <li>Sessió: Surt. Això esborra espais.sessio d’aquest navegador i revoca el codi de sessió.</li>
        <li>Avís: Tanca l’avís. No torna a sortir en aquest navegador fins que esborris les dades del lloc.</li>
        <li>
          No hi ha un consentiment per retirar. Si esborres les dades del lloc al navegador, s’eliminen
          l’emmagatzematge local i la còpia dels fitxers. Si el navegador bloqueja aquest emmagatzematge, Espais no
          recorda el mode ni la sessió.
        </li>
      </ul>
    </section>

    <section class="mt-8 space-y-3" aria-labelledby="normativa">
      <h2 id="normativa" class="text-xl font-semibold">Normativa</h2>
      <ul class="list-disc space-y-2 pl-5">
        <li>
          <a class="underline break-all" href="https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758">
            Llei 34/2002, article 22.2 (BOE)
          </a>
        </li>
        <li>
          <a class="underline break-all" href="https://www.aepd.es/guias/guia-cookies.pdf">
            Guia sobre l’ús de les cookies de l’AEPD (maig de 2024)
          </a>
        </li>
      </ul>
    </section>
  </main>
</template>
