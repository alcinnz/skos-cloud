function parseUrl(url, callback) {
  const SKOSns = "http://www.w3.org/2004/02/skos/core#"

  var rdf = {}
  fetch(url).then((response) => response.text()).then((text) => {
    new N3.Parser().parse(text, (err, triple, prefixes) => {
      if (err == null && triple == null) {
        completed(); return;
      }
      if (triple == null) return

      if (triple.object.endsWith("@en")) {
        triple.object = triple.object.slice(0, -3)
      } else if (triple.object[0] == '"') return

      if (!(triple.subject in rdf)) rdf[triple.subject] = {}
      if (!(triple.predicate in rdf[triple.subject]))
        rdf[triple.subject][triple.predicate] = []
      rdf[triple.subject][triple.predicate].push(triple.object)
    })
  })

  function completed() {
    console.log(rdf)

    var concepts = []
    for (var subject in rdf) {
      var label = rdf[subject][SKOSns+"prefLabel"][0]
      concepts.push({children: [],
              name: label.slice(1, -1),
              url: subject})
    }
    if (concepts.length == 1) callback(concepts[0])
    else callback({children: concepts, name: "Vocabulary"})
  }
}

function fetchJSON(url, callback) {
  return fetch(url).then((response) => response.text()).then((text) => {
    callback(JSON.parse(text))
  })
}
