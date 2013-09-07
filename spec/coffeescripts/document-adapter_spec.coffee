Ember.ENV.TESTING = true

describe 'EmberCouchDBKit.DocumentAdapter' , ->
  beforeEach ->
    @subject = new TestEnv()

  describe 'model creation', ->

    it 'record with specific id', ->
      person = @subject.create.call(@, 'person', {id: 'john@example.com'})

      runs ->
        expect(person.id).toBe('john@example.com')
        expect(person.get('_data.rev')).not.toBeNull()
        expect(person.get('_data.rev')).not.toBeUndefined()

    it 'record with generated id', ->
      person = @subject.create.call(@, 'person', {})

      runs ->
        expect(person.id).not.toBeNull()


    it 'simple {a:"a", b:"b"} model', ->
      person = @subject.create.call(@, 'person', {a: 'a', b: 'b'})

      runs ->
        expect(person.get('a')).toBe('a')
        expect(person.get('b')).toBe('b')


    it 'always available as a raw json object', ->
      person = @subject.create.call(@, 'person', {name: 'john'})

      runs ->
        expect(person.get('_data').name).toBe('john')

    it 'belongsTo relation', ->
      person = @subject.create.call(@, 'person', {name: 'john'})

      runs ->
        article = @subject.create.call(@, 'article', {})
        runs ->
          article.set('person', person)
          article.save()

          waitsFor ->
            article.get('_data.person') != null

          runs ->
            expect(article.get('person.name')).toBe('john')

#    it 'belongsTo field avilable as a raw js object', ->
#      person = @subject.create.call(@, 'person', {name: 'john'})
#
#      runs ->
#        message = @subject.create.call(@, 'message', {person: person})
#        runs ->
#          expect(message.get('_data.person')).toBe('john')

    it 'with hasMany', ->
      comment = @subject.create.call(@, 'comment', {text: 'text'})
      article = undefined

      runs ->
        article = @subject.create.call(@, 'article', {label: 'Label', comments: []})

      oldRev = undefined

      runs ->
        oldRev = article.get("_data.rev")
        article.set('comments.content', [])
        article.get('comments').pushObject(comment)
        article.save()

      waitsFor ->
        article.get('_data.rev') != oldRev
      ,"", 3000

      runs ->
        expect(article.get('_data').comments[0]).toBe(comment.id)

  describe 'model updating', ->

    it 'in general', ->
      person = @subject.create.call(@, 'person', {name: "John"})
      prevRev = undefined

      runs ->
        prevRev = person.get("_data.rev")
        person.set('name', 'Bobby')
        person.save()

      waitsFor ->
        prevRev != person.get("_data.rev")
      ,"", 3000

      runs ->
        expect(prevRev).not.toEqual(person.get("_data.rev"))

    it 'belongsTo relation', ->
      name = 'Vpupkin'
      newName = 'Bobby'

      person1 = @subject.create.call(@, 'person', {name: name})

      article = undefined
      prevRev = undefined
      person2 = undefined

      runs ->
        article = @subject.create.call(@, 'article', {label: 'Label', person: person1})

      runs ->
        prevRev =  article.get("_data.rev")
        person2 = @subject.create.call(@, 'person', {name: newName})

      runs ->
        article.set('person', person2)
        article.save()

      waitsFor ->
        prevRev != article.get("_data.rev")
      ,"", 3000

      runs ->
        expect(prevRev).not.toEqual(article.get("_data.rev"))
        expect(article.get('person')).toEqual(person2.id)

    it 'updates hasMany relation', ->
      comment = @subject.create.call(@, 'comment', {text: 'Text'})

      article = undefined
      comment2 = undefined

      runs ->
        article = @subject.create.call(@, Fixture.Article, {label: 'Label', comments: []})

      runs ->
        article.set('comments.content', [])
        article.get('comments').pushObject(comment)
        article.save()

      waitsFor ->
        article.get('_data.raw').comments != undefined
      ,"", 3000

      runs ->
        expect(article.get('comments').toArray().length).toEqual(1)
        comment2 = @subject.create.call(@, 'comment', {text: 'Text2'})

      runs ->
        article.get('comments').pushObject(comment2)
        article.save()

      waitsFor ->
        article.get('_data.raw').comments != undefined && article.get('_data.raw').comments.length == 2
      ,"", 3000

      runs ->
        expect(article.get('comments').toArray().length).toEqual(2)


#  describe "deletion", ->
#
#    it "in general", ->
#      person = @subject.create.call(@, Fixture.Person, {name: 'Vpupkin'})
#
#      runs ->
#        person.deleteRecord()
#        person.save()
#        expect(person.get('isDeleted')).toBe(true)
