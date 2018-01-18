/** Converts SKOS into a format closer to what we want to display.

    It only supports Turtle/N3 format, as other parsers for JavaScript
are unacceptably slow. */
var concepts = {}
var lang = "en"
const RDFns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
const SKOSns = "http://www.w3.org/2004/02/skos/core#"
function parseVocab_(txt, callback, reject) {
  new N3.Parser().parse(txt, (err, triple, prefixes) => {
    if (err) alert(JSON.stringify(err))

    if (!triple) {
      setTimeout(_normalizeVocab, 0, callback, reject)
      return
    }
    if (!(triple.subject in concepts))
      concepts[triple.subject] = {id: triple.subject, subconcepts: [],
            related: []}
    var concept = concepts[triple.subject]

    if (triple.predicate == RDFns+"type" && triple.object == SKOSns+"Concept")
      concept.isConcept = true
    if (triple.predicate == SKOSns+"prefLabel") {
      var text = triple.object
      // Perform localization
      if (text.endsWith("@"+lang))
        text = text.slice(0, -("@"+lang).length)
      if (text.endsWith('"') && text[0] == '"')
          text = text.slice(1, -1)
      else return

      concept.label = text
    }
    if (triple.predicate == SKOSns+"narrower") {
      if (!(triple.object in concepts))
        concepts[triple.object] = {id: triple.object, subconcepts: [],
            related: []}
      concepts[triple.object].subconcepts.push(triple.subject)
    }
    if (triple.predicate == SKOSns+"broader") {
      concept.subconcepts.push(triple.object)
    }

    if (triple.predicate == SKOSns+"narrowerTransitive") {
      if (!(triple.object in concepts))
        concepts[triple.object] = {id: triple.object, subconcepts: [],
            related: []}
      concepts[triple.object].subconcepts.push({
            transitive: true, id: triple.subject})
    }
    if (triple.predicate == SKOSns+"broaderTransitive")
      triple.subconcepts.push({transitive: true, id: triple.object})

    if (triple.predicate == SKOSns+"related")
      concept.related.push(triple.object)
  })
}
function parseVocab(txt) {
  return new Promise(function(resolve, reject) {
    parseVocab_(txt, resolve, reject)
  })
}

function fetchVocab(url) {
  return fetch(url).then((response) => response.text()).then(parseVocab)
}

function _normalizeVocab(callback, reject) {
  function it1__parents_prop_and_verify() {
    for (var id in concepts) {
      if (!concepts.hasOwnProperty(id)) continue

      var concept = concepts[id]
      concept.parents = []
      if (!concept.isConcept) {
        delete concepts[id];
        continue
      }
      if (!("label" in concept))
        reject("Cannot render vocabulary, unnamed concept!")
    }

    setTimeout(it2__apply_simple_parents, 0)
  }
  it1__parents_prop_and_verify()

  function it2__apply_simple_parents() {
    var first = true
    for (var id in concepts) {
      if (!concepts.hasOwnProperty(id)) continue

      var concept = concepts[id]
      for (var subconcept of concept.subconcepts) {
        if (subconcept.transitive) subconcept = subconcept.id

        var subconceptObj = concepts[subconcept]
        if (!subconceptObj || !("parents" in subconceptObj))
          console.log("Invalid concept:", subconcept, subconceptObj)
        else subconceptObj.parents.push(id)
      }

      // skos:related is defined as symmetric
      for (var related of concept.related) {
        if (!(related in concepts)) console.log("Invalid concept:", related)
        else if (concepts[related].related.indexOf(id) != -1)
          concepts[related].related.push(id)
      }
    }

    setTimeout(it3__apply_transitivity__assert_acyclic, 0)
  }

  function it3__apply_transitivity__assert_acyclic() {
    function walkTree(concept) {
      var seenSubconcepts = {}
      concept.ancestorOfCurrent = true
      for (var i = 0; i < concept.subconcepts.length; i++) {
        var subconcept = concept.subconcepts[i]
        if (!subconcept) continue

        var id = subconcept.transitive ? subconcept.id : subconcept
        if (!(id in concepts) || id in seenSubconcepts) {
          concept.subconcepts[i] = null
          continue
        } else seenSubconcepts[id] = true

        if (subconcept.transitive) {
          concept.subconcepts[i] = subconcept.id
          subconcept.parents = subconcept.parents + concept.parents
          subconcept = subconcept.id
        }

        // NOTE: SKOS doesn't require this, but our display does. 
        // And it's a commonly implied property of SKOS graphs. 
        if (concepts[subconcept].ancestorOfCurrent) {
          reject("Invalid Vocabulary: A broader concept can't also be narrower!", concept, subconcept)
          return
        }

        walkTree(concepts[subconcept])
      }
      concept.ancestorOfCurrent = false
    }

    for (var id in concepts) {
      if (!concepts.hasOwnProperty(id) || concepts[id].parents.length) continue
      walkTree(concepts[id])
    }

    setTimeout(it4__deduplicate, 0)
  }

  function it4__deduplicate() {
    function deduplicate(arr) {
      var ret = []
      var seen = {}
      for (var concept of arr) {
        if (!concept || arr in seen) continue
        seen[concept] = true
        ret.push(concept)
      }
      return ret
    }

    for (var id in concepts) {
      if (!concepts.hasOwnProperty(id)) continue;
      var concept = concepts[id]
      concept.parents = deduplicate(concept.parents)
      concept.subconcepts = deduplicate(concept.subconcepts)
      concept.related = deduplicate(concept.related)
    }

    setTimeout(callback, 0, concepts)
  }
}
