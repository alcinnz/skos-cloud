/** Positions words to communicate their hierarchy.

    Takes a mapping of JSON objects containing id, label, subconcepts, parents, and related fields.

    Outputs a JSON tree containing id, label, colour, scale, horizontal, x, & y
properties. The id field can be used to map back into the input, which can
be helpful for communicating those additional properties via interaction. */
function layoutVocab(renderTree, callback, font, rdf) {
  if (!font) font = {size: 25, minSize: 10, step: 5, style: "bold ? sans-serif"}
  console.log("Laying out", renderTree)

  var flatConcepts = renderTree.flatConcepts || [], newSubconcepts = []
  for (var concept of renderTree.subconcepts) {
    if (concept.subconcepts.length == 0) flatConcepts.push(concept)
    else newSubconcepts.push(concept)
  }
  renderTree.subconcepts = newSubconcepts

  function colorize(layer, depth, path = []) {
    layer.colour = d3.hsl(Math.random()*360, 1, 0.2 - 0.06*depth).toString()

    path.push(layer.label)
    if (layer.subconcepts === undefined)
      console.log(layer, "has undefined branches", path)

    for (var branch of layer.subconcepts) colorize(branch, depth + 1, path.slice())
  }
  colorize(renderTree, 0)

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
      if (branch.perpendicularSize == 0) continue

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
    parallelSize += 50 // Ensure padding makes it's way into the layout.

    // Third pass: Ensure text fits
    var textLength = getTextWidth(layer.label, font.style.replace("?", fontSize+"px"))
    layer.parallelSize = Math.max(textLength, parallelSize)
    layer.parallelSize += 2 // Add space to move text slightly from it's parent

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
    layer.width = layer.parallelSize
    layer.height = layer.fontSize

    if (horizontal) {
      layer.x = rootX
      layer.y = rootY + layer.offset + layer.topSize

      for (var branch of layer.top) {
        positionWords(branch, !horizontal, rootX, rootY + layer.offset)
        // Adjust positioning to not be so snuggled up against parent
        branch.height -= 2
      }
      for (var branch of layer.bottom) {
        positionWords(branch, !horizontal, rootX, layer.y + layer.fontSize)

        branch.height -= 2
        branch.y += 2
      }
    } else {
      layer.x = rootX + layer.offset + layer.topSize
      layer.y = rootY

      for (var branch of layer.top) {
        positionWords(branch, !horizontal, rootX + layer.offset, rootY)

        branch.width -= 2
      }
      for (var branch of layer.bottom) {
        positionWords(branch, !horizontal, layer.x + layer.fontSize, rootY)

        branch.width -= 2
        branch.x += 2
      }
    }
  }

  function verticalText(layer, horizontal) {
    layer.horizontal = horizontal

    for (var branch of layer.branches) verticalText(branch, !horizontal)
  }

  function flattenRenderTree(l, words) {
    if (l.parallelSize == 0) return words // These are marked as too-small to render

    words.push({id: l.id, label: l.label, fontSize: l.fontSize,
        font: font.style.replace("?", l.fontSize + "px"), colour: l.colour,
        x: l.x, y: l.y, width: l.width + "px", height: l.height + "px",
        horizontal: l.horizontal, renderTree: l})
    for (var branch of l.branches) flattenRenderTree(branch, words)
    return words
  }

  var chain = new Deferred(() => estimateLayout(renderTree, font.size))
  chain.then(() => finalizeLayout(renderTree))
    .then(() => verticalText(renderTree, true))
    .then(() => renderTree.offset = 0)
    .then(() => positionWords(renderTree, true, 0, 0))
    .then(() => {
      var words = flattenRenderTree(renderTree, [])
      setTimeout(callback, 0, words, flatConcepts, {
            width: renderTree.parallelSize, height: renderTree.perpendicularSize}, renderTree.parents)
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
