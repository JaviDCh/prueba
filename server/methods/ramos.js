﻿

import { Ramos } from '/imports/collections/catalogos/ramos'; 

Meteor.methods(
{
    ramosSave: function (ramos) {

        if (!_.isArray(ramos) || ramos.length == 0) {
            throw new Meteor.Error("Aparentemente, no se han editado los datos en la forma. No hay nada que actualizar.");
        }

        var inserts = _.chain(ramos).
                      filter(function (item) { return item.docState && item.docState == 1; }).
                      map(function (item) { delete item.docState; return item; }).
                      value();


        inserts.forEach(function (item) {
            Ramos.insert(item, function (error, result) {
                if (error)
                    throw new Meteor.Error("validationErrors", error.invalidKeys.toString());
            });
        });


        var updates = _.chain(ramos).
                        filter(function (item) { return item.docState && item.docState == 2; }).
                        map(function (item) { delete item.docState; return item; }).                // eliminamos docState del objeto 
                        map(function (item) { return { _id: item._id, object: item }; }).           // separamos el _id del objeto 
                        map(function (item) { delete item.object._id; return item; }).             // eliminamos _id del objeto (arriba lo separamos) 
                        value();

        updates.forEach(function (item) {
            Ramos.update({ _id: item._id }, { $set: item.object }, {}, function (error, result) {
                //The list of errors is available on `error.invalidKeys` or by calling Books.simpleSchema().namedContext().invalidKeys()
                if (error)
                    throw new Meteor.Error("validationErrors", error.invalidKeys.toString());
            });
        });

        var removes = _.filter(ramos, function (item) { return item.docState && item.docState == 3; });

        removes.forEach(function (item) {
            Ramos.remove({ _id: item._id });
        });

        return "Ok, los datos han sido actualizados en la base de datos.";
    }
});