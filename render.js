function renderVocab(words, $canvas) {
  var bgColour = '#fff'
  var cloud = $canvas.style('position', 'absolute').selectAll('a')
                .data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .style('font', (word) => word.font)
    .style('background', (word) => word.colour)
    .style('color', bgColour)
    .style('text-align', 'center')
    .style('position', 'absolute')
    .style('left', (word) => word.x + "px")
    .style('top', (word) => word.y + "px")
    .style('width', (word) => word.width)
    .style('height', (word) => word.height)
    .style('line-height', 1) // Just what seems to work
    .style('white-space', 'pre')
}
