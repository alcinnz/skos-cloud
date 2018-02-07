QUnit.test( "canaries", function( assert ) {
  assert.ok( true, "Passed!" )
  assert.equal("hello", "hello")
})
QUnit.test( "end 2 end", function( assert ) {
  end2endTest(0, assert)
  end2endTest(1, assert)
  end2endTest(2, assert)
})

function end2endTest(name, assert) {
  var done = assert.async()
  parseUrl("tests/"+name+".ttl", (vocab) => {
    fetch("tests/"+name+".json").then((resp) => resp.text()).then((text) => {
      assert.deepEqual(vocab, JSON.parse(text))
      done()
    })
  })
}
