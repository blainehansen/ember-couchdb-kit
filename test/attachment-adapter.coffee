chai = require('chai')
sinon = require('sinon')
sinonChai = require('sinon-chai')
expect = chai.expect

chai.use(sinonChai)

EmberCouchDBKitStub = {}

DBStub = {
  JSONSerializer: {
    extend: (o) -> 
      o.get = sinon.spy()
      o
  },
  Adapter: {
    extend: (o) -> 
      o.get = sinon.spy()
      o
  }
}

xhrOpen = sinon.spy()
xhrSetRequestHeader = sinon.spy()
xhrSend = sinon.spy()

XHR = sinon.stub().returns({
  open: xhrOpen
  setRequestHeader: xhrSetRequestHeader
  send: xhrSend
})

require("../src/attachment-adapter.coffee")(EmberCouchDBKitStub, DBStub, XHR)

String.prototype.fmt = ->

describe "AttachmentSerializer", ->
  beforeEach ->
    XHR.reset()
    xhrOpen.reset()
    xhrSetRequestHeader.reset()
    xhrSend.reset()

  describe "API", ->
    it "has the expected API", ->
      expect(EmberCouchDBKitStub.AttachmentSerializer.materialize).to.exist

  describe "Integration", ->
    it "make any call to the coachdb", ->
      store = {
        didSaveRecord: sinon.stub()
      }

      data = {
        get: sinon.spy()
      }

      EmberCouchDBKitStub.AttachmentAdapter.createRecord(store, null, data)
      expect(xhrOpen).calledOnce
      expect(xhrSetRequestHeader).calledWith('Content-Type', undefined)
      expect(xhrSend).calledOnce

      #this.requests[0].respond(200, { "Content-Type": "application/json" },
      #  '[{ "id": 12, "comment": "Hey there" }]');
      #  assert(callback.calledWith([{ id: 12, comment: "Hey there" }]));

