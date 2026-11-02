# Room planner 3D

Un punto di partenza per ricostruire la tua stanza e provare a spostare i mobili. L'app mostra una pianta 2D e una vista 3D. La stanza iniziale è vuota e usa misure di esempio: sostituiscile con quelle reali.

Su telefono usa l'app in orizzontale. Il pulsante in alto a destra apre il pannello sopra la vista; Pianta e 3D restano accessibili a pannello chiuso. Nella vista 3D il joystick sinistro muove e quello destro orienta la visuale. In verticale appare un invito a ruotare il telefono.

## Comincia con il tuo agente AI

Copia il link di questa repository e invialo al tuo agente AI con questo messaggio:

> Vorrei creare la mia stanza usando questo progetto. Leggi il README, guidami nella raccolta di foto e misure e aiutami a personalizzare e avviare l'app.

L'agente deve poter leggere la repository e lavorare su file di codice. Se non può aprire il link o modificare file, chiedigli come fornirgli una copia del progetto o usare un ambiente adatto: il solo link non garantisce che tutti gli assistenti possano farlo.

Prendi un metro e, se il tuo assistente lo permette, attiva la modalità vocale sul telefono. Gira per la stanza, scatta foto e comunica le misure man mano. Puoi anche inviare tutto per iscritto. L'agente ti aiuterà a capire cosa manca.

1. Misura **tutta la stanza**: larghezza, lunghezza e altezza. Se non è rettangolare, misura ogni parete, rientranze e sporgenze, indicando come si collegano.
2. Fotografa la stanza da più punti e indica dove sono porte, finestre, termosifoni e altri elementi fissi. Misura posizione, dimensioni, altezza da terra e verso di apertura quando servono.
3. Per ogni mobile o oggetto, invia una o più foto e indica larghezza, profondità, altezza, materiale e colore. Spiega dove si trova rispetto alle pareti o ad altri elementi e in che direzione è rivolto. Specifica se è appoggiato, sospeso o fissato a parete e a quale altezza.
4. Chiedi all'agente di mostrarti il risultato e correggi con lui ciò che non corrisponde alla realtà.

Condividi foto e misure solo se sei a tuo agio: possono mostrare informazioni private. Il progetto non carica foto da solo; controlla le impostazioni del servizio AI che usi e non pubblicare accidentalmente i tuoi dati.

## Istruzioni per l'agente AI

Leggi questa sezione anche se l'utente ha scritto soltanto «fallo». Il progetto è un prototipo web con Vite e Three.js: una pianta interattiva, una vista 3D, dimensioni modificabili, mobili aggiungibili e salvataggio nel browser. La stanza iniziale è un esempio generico, non rappresenta la stanza dell'utente. Supporta direttamente stanze rettangolari; forme diverse, aperture, elementi fissi e modelli dettagliati richiedono modifiche al codice.

- Rispondi nella lingua dell'utente, con parole comuni e frasi brevi. Spiega cosa fare un passo alla volta, senza dare per scontate competenze tecniche. Non è necessaria alcuna skill esterna.
- Chiedi prima **larghezza, lunghezza e altezza complessive della stanza**. Se non sono state fornite, ricordale esplicitamente anche quando l'utente ha già mandato foto e misure dei mobili. Per stanze irregolari chiedi misure delle pareti e uno schema delle rientranze.
- Suggerisci, se disponibile, la modalità vocale sul telefono mentre la persona si muove con un metro. Chiedi foto panoramiche e dei singoli elementi. Per ciascuno raccogli larghezza, profondità, altezza, posizione, orientamento, materiale e colore; per elementi sospesi chiedi l'altezza da terra. Chiedi anche posizione, misure e apertura di porte e finestre, oltre agli altri elementi fissi rilevanti.
- Fai domande in piccoli gruppi. Se mancano dati, chiedili e distingui chiaramente le stime dalle misure; non inventare dettagli ricavati dalle foto.
- Usa le informazioni per adattare la stanza e realizzare la rappresentazione degli elementi, estendendo il codice quando necessario. Mantieni le funzioni utili e verifica che l'app si avvii e che le dimensioni e le posizioni siano coerenti. Le collisioni e le distanze vanno verificate: il prototipo non è uno strumento di progettazione certificato.
- Spiega come aprire e usare il risultato. Non pubblicare foto, misure o modifiche personali senza il consenso dell'utente. Ricorda che il salvataggio corrente è locale al browser.

## Texture e materiali facoltativi

In [risorse/materiali-512](risorse/materiali-512/README.md) trovi una piccola raccolta di texture CC0 per legno, tessuto, intonaco e piastrelle. Puoi chiedere al tuo agente di applicarle se vuoi più realismo: il progetto non le usa automaticamente. Puoi anche cercare online altri modelli 3D, oggetti e materiali, verificando la licenza di ciascuna risorsa prima di usarla o ridistribuirla.

## Avvio per chi sviluppa

Con Node.js installato:

```sh
npm install
npm run dev
```

Apri l'indirizzo mostrato nel terminale. `npm run build` verifica la compilazione. I dati inseriti nell'app restano nel browser utilizzato; cancellare i dati del browser li rimuove. Il progetto è una base da personalizzare, non una ricostruzione automatica dalle foto.

## Mettere la stanza online (facoltativo)

Quando hai finito, puoi chiedere all'agente di aiutarti a pubblicare la tua versione. Un sito online può rendere visibili a chiunque la stanza, le misure e gli eventuali file inclusi: controlla cosa vuoi condividere prima di procedere. I dati salvati nel browser restano locali a quel browser e non vengono sincronizzati tra dispositivi da questo prototipo.

Se scegli di pubblicare, puoi usare Cloudflare. Chiedi all'agente di accompagnarti passo per passo:

1. Crea un account Cloudflare su https://dash.cloudflare.com/sign-up se non ne hai già uno, quindi accedi.
2. Se il tuo agente supporta MCP, collega il server Cloudflare `https://mcp.cloudflare.com/mcp` dalle impostazioni dell'agente e autorizza l'accesso al tuo account. La procedura cambia a seconda dell'assistente: chiedigli di guidarti. Non incollare password o token nella chat. Per i dettagli: https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/.
3. Scegli con l'agente se collegare una tua repository GitHub o distribuire i file compilati direttamente. Una repository collegata permette aggiornamenti automatici quando invii le modifiche; per l'alternativa diretta l'agente può usare gli strumenti supportati dal tuo ambiente, come Wrangler. Il collegamento MCP da solo non garantisce che ogni agente possa caricare i file.
4. L'agente deve controllare le impostazioni di build per questo progetto Vite (`npm run build`, cartella di output `dist`), verificare permessi e costi applicabili, spiegarti cosa sarà pubblico e guidarti nella pubblicazione. Documentazione: https://developers.cloudflare.com/workers/ci-cd/builds/ e https://developers.cloudflare.com/workers/static-assets/.
5. Apri il link ottenuto e verifica che funzioni. Conserva il progetto originale: per aggiornare il sito dovrai pubblicare di nuovo oppure inviare le modifiche alla repository collegata.

**Per l'agente:** a fine personalizzazione chiedi se la persona vuole mettere online la stanza. Procedi con questa guida solo se risponde di sì. Controlla i permessi effettivi degli strumenti, usa la documentazione aggiornata e non promettere che il solo collegamento MCP basti a distribuire il progetto. Se la persona preferisce tenere la stanza privata, aiutala a usarla in locale.
