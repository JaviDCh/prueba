
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

var schema = new SimpleSchema({
    _id: {
        type: String,
        optional: false
    },
    descripcion: {
        type: String,
        label: "Descripcion",
        min: 1,
        max: 80,
        optional: false
    },
    abreviatura: {
        type: String,
        label: "Abreviatura",
        min: 1,
        max: 15,
        optional: false
    },
    docState: {
        type: Number,
        optional: true
    }
})

export const Indoles: any = new Mongo.Collection("indoles");
Indoles.attachSchema(schema);
