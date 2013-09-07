(function() {
  Ember.ENV.TESTING = true;

  describe('EmberCouchDBKit.DocumentAdapter', function() {
    beforeEach(function() {
      return this.subject = new TestEnv();
    });
    return describe('model creation', function() {
      it('record with specific id', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          id: 'john@example.com'
        });
        return runs(function() {
          expect(person.id).toBe('john@example.com');
          expect(person.get('_data.rev')).not.toBeNull();
          return expect(person.get('_data.rev')).not.toBeUndefined();
        });
      });
      it('record with generated id', function() {
        var person;

        person = this.subject.create.call(this, 'person', {});
        return runs(function() {
          return expect(person.id).not.toBeNull();
        });
      });
      it('simple {a:"a", b:"b"} model', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          a: 'a',
          b: 'b'
        });
        return runs(function() {
          expect(person.get('a')).toBe('a');
          return expect(person.get('b')).toBe('b');
        });
      });
      it('always available as a raw json object', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'john'
        });
        return runs(function() {
          return expect(person.get('_data').name).toBe('john');
        });
      });
      it('belongsTo relation', function() {
        var person;

        person = this.subject.create.call(this, 'person', {
          name: 'john'
        });
        return runs(function() {
          var article;

          article = this.subject.create.call(this, 'article', {});
          return runs(function() {
            article.set('person', person);
            article.save();
            waitsFor(function() {
              return article.get('_data.person') !== null;
            });
            return runs(function() {
              return expect(article.get('person.name')).toBe('john');
            });
          });
        });
      });
      return it('with hasMany', function() {
        var article, comment;

        comment = this.subject.create.call(this, 'comment', {
          text: 'text'
        });
        article = void 0;
        runs(function() {
          return article = this.subject.create.call(this, 'article', {
            label: 'Label',
            comments: []
          });
        });
        return runs(function() {
          article.get('comments').pushObject(comment);
          article.get('comments');
          return article.save();
        });
      });
    });
  });

}).call(this);
