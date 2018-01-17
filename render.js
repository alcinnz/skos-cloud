function renderVocab(words, $canvas) {
  var cloud = $canvas.style('position', 'absolute').selectAll('a')
                .data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .style('font', (word) => word.font)
    .style('color', (word) => word.colour)
    .style('text-align', 'center')
    .style('position', 'absolute')
    .style('left', (word) => word.x + "px")
    .style('top', (word) => word.y + "px")
    .style('width', (word) => word.width)
    .style('height', (word) => word.height)
    .style('line-height', 1.08) // Just what seems to work
    .style('white-space', 'pre')
    .style('border', 'thin solid')
}
