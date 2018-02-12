/** Converts SKOS into a format closer to what we want to display.

  It only supports Turtle/N3 format for now, as other parsers for JavaScript are unacceptably slow. */
function fetchVocab(url, callback) {
  const SKOSns = "http://www.w3.org/2004/02/skos/core#"

  var rdf = {}
  function readRDF() {
    fetch(url).then((response) => response.text()).then((ttl) => {
      var topConcepts = [], schema
      new N3.Parser().parse(ttl, (err, triple, prefixes) => {
        if (err == null && triple == null) loadTopConcepts(topConcepts, schema)
        if (triple == null) return

        if (triple.predicate == SKOSns+"hasTopConcept") {
          if (topConcepts.indexOf(triple.object) == -1)
            topConcepts.push(triple.object)
          schema = triple.subject
        }

        if (triple.object.endsWith("@en"))
          triple.object = triple.object.slice(1, -4)
        else if ("'\"".indexOf(triple.object[0]) >= 0) {
          if (triple.object.endsWith(triple.object[0]))
            triple.object = triple.object.slice(1, -1)
          else return
        }

        if (!(triple.subject in rdf)) rdf[triple.subject] = {}
        if (!(triple.predicate in rdf[triple.subject]))
          rdf[triple.subject][triple.predicate] = []
        if (rdf[triple.subject][triple.predicate].indexOf(triple.object) == -1)
          rdf[triple.subject][triple.predicate].push(triple.object)
      })
    })
  }
  readRDF()

  function loadSubject(subject, _ignoreSameAs = []) {
    var data = rdf[subject]
    if (data == undefined) return {}

    // apply owl:sameAs
    const OWLns = "http://www.w3.org/2002/07/owl#"
    if (!(OWLns+"sameAs" in data)) return data // Fast case

    for (var extension of data[OWLns+"sameAs"]) {
      if (_ignoreSameAs.indexOf(extension) != -1) continue
      _ignoreSameAs.push(extension)

      var other = loadSubject(extension, _ignoreSameAs)
      for (var predicate in other)
        data[predicate] = other[predicate].concat(subject[predicate])
    }

    delete data[OWLns+"sameAs"] // Don't spend this effort again
    return data
  }

  function loadTopConcepts(concepts, schema) {
    if (concepts.length == 1) callback(loadConcept(concepts[0]))
    else {
      var children = []
      for (var concept of concepts) children.push(loadConcept(concept))

      //var schemaData = loadSubject(schema)
      var label = /*SKOSns+"prefLabel" in schemaData ?
          schemaData[SKOSns+"prefLabel"][0] :*/ "Vocabulary"

      callback({
        label: label, subconcepts: children, id: schema,
        related: [], parents: []
      })
    }
  }

  function loadConcept(concept) {
    var data = loadSubject(concept)

    if (!(SKOSns+"prefLabel" in data)) {
      console.log("Invalid concept!", concept, data)
      return {}
    }

    var children = []
    for (var child of data[SKOSns+"narrower"] ||
        data[SKOSns+"narrowerTransitive"] || [])
      children.push(loadConcept(child))

    return {label: data[SKOSns+"prefLabel"][0],
            subconcepts: children,
            id: concept,
            related: data[SKOSns+"related"] || [],
            parents: data[SKOSns+"broaderTransitive"] ||
                      data[SKOSns+"broader"] || []
    }
  }
}
