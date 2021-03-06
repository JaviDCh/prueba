

import { Filtros } from '/imports/collections/otros/filtros'; 

Filtros.allow({
    insert: function (userId, doc) {
        if (userId && userId === doc.userId)
            return true;
        else
            return false;
    },
    update: function (userId, doc, fields, modifier) {
        if (userId && userId === doc.userId) {
            return true;
        }
        else {
            return false;
        }
    },
    remove: function (userId, doc) {
        if (userId && userId === doc.userId)
            return true;
        else
            return false;
    }
});