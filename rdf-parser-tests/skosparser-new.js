function parseUrl(url, callback) {
  const SKOSns = "http://www.w3.org/2004/02/skos/core#"

  fetch(url).then((response) => response.text()).then((ttl) => {
    var topConcepts = [], schema
    var labels = {}
    new N3.Parser().parse(ttl, (err, triple, prefixes) => {
      if (err == null && triple == null) {
        var vocabName = schema in labels ? labels[schema] : "Vocabulary"
        fetchTopConcepts(topConcepts, schema, vocabName); return;
      }
      if (triple == null) return

      if (triple.predicate == SKOSns+"hasTopConcept") {
        topConcepts.push(triple.object)
        schema = triple.subject
      }
      if (triple.predicate == SKOSns+"prefLabel" && triple.object.endsWith("@en"))
        labels[triple.subject] = triple.object.slice(1, -4)
    })

    function fetchTopConcepts(concepts, schema, labels) {
      if (concepts.length == 1) fetch(concepts[0], callback)
      else {
        fetchAll(concepts, (concepts) => {
          callback({
            name: label,
            children: concepts,
            url: schema
          })
        })
      }
    }

    function fetchAll(concepts, cb) {
      if (concepts == undefined) return cb([])

      var countdown = concepts.length, results = []
      for (let i = 0; i < concepts.length; i++) fetch(concepts[i], (data) => {
        results[i] = data
        countdown--
        if (countdown == 0) cb(results)
      })
    }

    function fetch(concept, cb) {
      loadSubject(ttl, concept, (data) => {
        fetchAll(data[SKOSns+"narrower"], (children) => {
          cb({name: data[SKOSns+"prefLabel"][0],
            children: children,
            url: concept
          })
        })
      })
    }
  })
}

function loadSubject(ttl, subject, callback) {
  var data = {}
  new N3.Parser().parse(ttl, (err, triple, prefixes) => {
    if (triple == null && err == null) callback(data)
    if (triple == null || triple.subject != subject) return

    if (triple.object.endsWith("@en")) triple.object = triple.object.slice(1, -4)
    else if (triple.object[0] == '"' || triple.object[0] == "'") return

    if (!(triple.predicate in data)) data[triple.predicate] = []
    if (data[triple.predicate].indexOf(triple.object) == -1)
      data[triple.predicate].push(triple.object)
  })
}

function fetchJSON(url, callback) {
  return fetch(url).then((response) => response.text()).then((text) => {
    callback(JSON.parse(text))
  })
}
