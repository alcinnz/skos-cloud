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

    var vocab = {}
    for (var subject in rdf) {
      var concept = rdf[subject]
      // TODO filter out non-concepts

      var children = []
      var childSet = {}
      for (var child of concept[SKOSns+"narrower"] || []) {
        if (!(child in rdf) || child in childSet) continue
        childSet[child] = true
        children.push(child)
      }

      var simpleConcept = {children: children,
              name: concept[SKOSns+"prefLabel"][0].slice(1, -1),
              url: subject}
      vocab[subject] = simpleConcept
    }

    for (var subject in rdf) {
      var concept = rdf[subject]
      var parents = {}
      for (var parent of concept[SKOSns+"broader"] || []) {
        if (!(parent in rdf) || parent in parents) continue
        parents[parent] = true

        var parentConcept = vocab[parent]
        if (parentConcept.children.indexOf(subject) == -1) parentConcept.children.push(subject)
      }
    }

    var nonRoots = {}
    for (var id in vocab) {
      var concept = vocab[id]
      for (var i = 0; i < concept.children.length; i++) {
        var child = concept.children[i]
        nonRoots[child] = true
        concept.children[i] = vocab[child]
      }
    }

    var concepts = []
    for (var id in vocab) {
      if (id in nonRoots) continue
      concepts.push(vocab[id])
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
