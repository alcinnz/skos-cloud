function renderVocab(words, canvas, font) {
  var cloud = d3.select(canvas).style('position', 'absolute').selectAll('a')
                .data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .style('font', font)
    .style('font-size', (word) => word.fontHeight)
    .style('color', (word) => word.colour)
    .style('position', 'absolute')
    .style('left', (word) => word.x)
    .style('top', (word) => word.y)
}
