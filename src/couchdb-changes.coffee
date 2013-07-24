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
  last_seq: null
  feed: "longpoll"
  filter: ((data) -> )
  context: @
  includeDocs: true

  longpoll: ->

    throw "You mast add db name" unless @get('db')

    url = "/%@/_changes?feed=%@".fmt(@get('db'), @get('feed'))
    if @get('last_seq')
      url += "&since=#{@get('last_seq')}"
    if @get('includeDocs') && @get('last_seq')
      url = url + "&include_docs=true"
    @_ajax(url)

  _ajax: (url) ->
    $.ajax({
      type: "GET",
      url: url,
      dataType: 'json',
      success: (data) =>
        if data?.results?.length && @get('last_seq')
          @get('filter').call(@get('context'), data.results)
        @set('last_seq', data.last_seq)
        @longpoll()
    })