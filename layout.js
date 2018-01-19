/** Positions words to communicate their hierarchy.

    Takes a mapping of JSON objects containing id, label, subconcepts, parents, and related fields.

    Outputs a JSON tree containing id, label, colour, scale, horizontal, x, & y
properties. The id field can be used to map back into the input, which can
be helpful for communicating those additional properties via interaction. */
function layoutVocab(vocab, callback, showChildless, title, font) {
  if (!title) title = "Vocabulary"
  if (!font) font = {size: 40, minSize: 10, step: 10, style: "bold ? sans-serif"}

  var renderTree = {id: "", label: title, colour: "#ccc", subconcepts: []}

  function buildRenderTree(concept, depth) {
    var layer = {id: concept.id, label: concept.label, subconcepts: []}
    layer.colour = d3.hsl(Math.random()*360, 1, 0.1 - 0.03*depth).toString()
    for (var subconcept of concept.subconcepts)
      layer.subconcepts.push(buildRenderTree(vocab[subconcept], depth + 1))

    return layer
  }

  for (var id in vocab) {
    if (!vocab.hasOwnProperty(id) || vocab[id].parents.length > 0) continue
    var concept = concepts[id]
    renderTree.subconcepts.push(buildRenderTree(concept, 1))
  }

  /* These "flatConcepts" can really clutter the visualization without
        adding anything to it. */
  var flatConcepts = [], newBranches = []
  for (var branch of renderTree.subconcepts) {
    if (!vocab.hasOwnProperty(id)) continue

    if (branch.subconcepts.length > 0) newBranches.push(branch)
    else flatConcepts.push(branch)
  }
  renderTree.subconcepts = newBranches

  // No point having an artificial root, if we've got real one.
  if (renderTree.subconcepts.length == 1) renderTree = renderTree.subconcepts[0]
  renderTree.offset = 0 // Won't otherwise get one. 

  function capBranches(layer) {
    // Without this traversal, your computer might be overwhelmed by
    //      by the number of concepts, and freeze.
    // Also you might be overwhelmed too, visually. 
    const MAX_BRANCHES = 15
    for (var branch of layer.subconcepts) capBranches(branch)

    while (layer.subconcepts.length > MAX_BRANCHES) {
      segment = layer.subconcepts.slice(0, MAX_BRANCHES)
      layer.subconcepts = layer.subconcepts.slice(MAX_BRANCHES)
      layer.subconcepts.push({id: layer.id, label: "...", colour: layer.colour,
                            subconcepts: segment})
    }
  }
  capBranches(renderTree)

  function estimateLayout(layer, fontSize) {
    if (fontSize < font.minSize) {
      // Don't let text get unreadable, require interaction instead. 
      layer.parallelSize = layer.perpendicularSize = 0
      return
    }
    layer.fontSize = fontSize
    console.log("estimateLayout()")

    /**
     * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
     * 
     * @param {String} text The text to be rendered.
     * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
     * 
     * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
     */
    function getTextWidth(text, font) {
        // re-use canvas object for better performance
        var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(text);
        return metrics.width;
    }

    // First pass length: sum of branches / 2
    var parallelSize = 0;
    layer.branches = [] // Branches for visual display
    for (var branch of layer.subconcepts) {
      estimateLayout(branch, fontSize - font.step)
      parallelSize += branch.perpendicularSize
      if (branch.perpendicularSize) layer.branches.push(branch)
    }
    parallelSize >>= 1

    // Second pass length: ensure the branches fit
    // Since this is a NP-complete problem (the Knapsack problem),
    //      this only approximates a rough solution. 
    layer.top = []; layer.bottom = []
    var topSize = 0, bottomSize = 0
    for (var branch of layer.branches) {
      if (layer.perpendicularSize == 0) continue

      var combinedTop = topSize + branch.perpendicularSize
      var combinedBottom = bottomSize + branch.perpendicularSize
      if (combinedTop <= parallelSize) {
        branch.offset = topSize
        topSize = combinedTop
        layer.top.push(branch)
      } else if (combinedBottom <= parallelSize) {
        branch.offset = bottomSize
        bottomSize = combinedBottom
        layer.bottom.push(branch)
      } else {
        // Now minimize the excess length
        if (combinedTop < combinedBottom) {
          branch.offset = topSize
          topSize = combinedTop
          layer.top.push(branch)
        } else {
          branch.offset = bottomSize
          bottomSize = combinedBottom
          layer.bottom.push(branch)
        }
      }
    }
    layer.topLength = topSize; layer.bottomLength = bottomSize
    parallelSize = Math.max(topSize, bottomSize)

    // Third pass: Ensure text fits
    var textLength = getTextWidth(layer.label, font.style.replace("?", fontSize+"px"))
    layer.parallelSize = Math.max(textLength, parallelSize)

    // Compute perpendicular length
    topSize = bottomSize = 0
    for (var branch of layer.top) {
      if (branch.parallelSize > topSize) topSize = branch.parallelSize
    }
    for (var branch of layer.bottom) {
      if (branch.parallelSize > bottomSize) bottomSize = branch.parallelSize
    }
    layer.perpendicularSize = topSize + fontSize + bottomSize
    layer.topSize = topSize; layer.bottomSize = bottomSize
  }

  function finalizeLayout(layer) {
    var padding = (layer.parallelSize - layer.topLength)/layer.top.length
    var xoffset = padding >> 1
    for (var branch of layer.top) {
      branch.parallelSize = layer.topSize
      finalizeLayout(branch)
      branch.offset += xoffset
      xoffset += padding
    }

    padding = (layer.parallelSize - layer.bottomLength)/layer.bottom.length
    xoffset = padding >> 1
    for (var branch of layer.bottom) {
      branch.parallelSize = layer.bottomSize
      finalizeLayout(branch)
      branch.offset += xoffset
      xoffset += padding
    }
  }

  function positionWords(layer, horizontal, rootX, rootY) {
    if (horizontal) {
      layer.x = rootX
      layer.y = rootY + layer.offset + layer.topSize
      layer.width = layer.parallelSize
      layer.height = layer.fontSize

      for (var branch of layer.top)
        positionWords(branch, !horizontal, rootX, rootY + layer.offset)
      for (var branch of layer.bottom)
        positionWords(branch, !horizontal, rootX, layer.y + layer.fontSize)
    } else {
      layer.x = rootX + layer.offset + layer.topSize
      layer.y = rootY
      layer.width = layer.fontSize
      layer.height = layer.parallelSize

      for (var branch of layer.top)
        positionWords(branch, !horizontal, rootX + layer.offset, rootY)
      for (var branch of layer.bottom)
        positionWords(branch, !horizontal, layer.x + layer.fontSize, rootY)
    }
  }

  function verticalText(layer, horizontal) {
    if (!horizontal) {
      var newLabel = ""
      for (var char of layer.label) newLabel += char + "\n"
      layer.label = newLabel

      layer.fontSize >>= 1
    }

    for (var branch of layer.branches) verticalText(branch, !horizontal)
  }

  function flattenRenderTree(l, words) {
    if (l.parallelSize == 0) return words // These are marked as too-small to render

    words.push({id: l.id, label: l.label,
        font: font.style.replace("?", l.fontSize + "px"), colour: l.colour,
        x: l.x, y: l.y, width: l.width + "px", height: l.height + "px"})
    for (var branch of l.branches) flattenRenderTree(branch, words)
    return words
  }

  var chain = new Deferred(() => estimateLayout(renderTree, font.size))
  chain.then(() => finalizeLayout(renderTree))
    .then(() => verticalText(renderTree, true))
    .then(() => positionWords(renderTree, true, 0, 0))
    .then(() => {
      var words = flattenRenderTree(renderTree, [])
      setTimeout(callback, 0, words, flatConcepts, {
            width: renderTree.parallelSize, height: renderTree.perpendicularSize})
    }, 0)
  chain.trigger()
}

function Deferred(func) {
  this.func = func
  this.next = {trigger: () => {}}
}
Deferred.prototype.then = function(func) {
  this.next = new Deferred(func)
  return this.next
}
Deferred.prototype.trigger = function() {
  setTimeout(() => {
    this.func(); this.next.trigger()
  }, 0)
}
