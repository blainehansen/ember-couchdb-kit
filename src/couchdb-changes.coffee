###
  CouchDb changes works with longpolling
  Create your change object: (I do this in my route)

    Application.MyRoute = Ember.Route.extend
      setupController: (controller, model) ->
        DS.CouchDBChanges.create({
          db: "my_couch_db"
          context: @ #for calling filter with data
          filter: @filter #pass function for filtering results
        })

      filter: (data) ->
        #this is filter function for changes
        data.forEach (changeItem) ->
          switch changeItem.doc.type
            when "my model type"
              #works with your model this
###

DS.CouchDBChanges = Ember.Object.extend
  db: null
  since: null
  filter: null
  callbackFilter: ((data) -> )
  context: @
  include_docs: true
  limit: null
  descending: false
  heartbeat: 60000
  timeout: 60000
  couchdbFilter: null #designdoc/filtername
  style: "main_only"  #all_docs | main_only

  continuous: ->
    @_checkDb()
    url = @_getUrl("continuous")
    @_ajax(@_withParams(url))

  normal: ->
    @_checkDb()
    url = @_getUrl("normal")
    @_ajax(@_withParams(url))

  longpoll: ->
    @_checkDb()
    url = @_getUrl("longpoll")
    @_ajax(@_withParams(url))

  _ajax: (url) ->
    $.ajax({
      type: "GET",
      url: url,
      dataType: 'json',
      success: (data) =>
        if data?.results?.length && @get('since')
          @get('callbackFilter').call(@get('context'), data.results)
        @set('since', data.last_seq)
        @longpoll()
    })

  _withParams: (url) ->
    if @get('since')
      ["include_docs", "limit", "descending", "heartbeat", "timeout", "filter", "style", "since"].forEach (prop) =>
        if @get(prop)
          url += "&#{prop}=#{@get(prop)}"
    url

  _checkDb: ->
    throw "You mast add db name" unless @get('db')

  _getUrl: (type) ->
    if @get('since')
      "/%@/_changes?feed=%@".fmt(@get('db'), type)
    else
      "/%@/_changes?descending=true&limit=1".fmt(@get('db'))