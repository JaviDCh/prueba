
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

var schema = new SimpleSchema({
    _id: { type: String, optional: false, },
    descripcion: { type: String, label: "Descripcion", min: 1,max: 80, optional: false, },
    abreviatura: { type: String, label: "Abreviatura", min: 1,max: 15, optional: false, },
    tipoRamo: { type: String, label: "Tipo de ramo (ej: Automóvil)", min: 0, max: 15, optional: true, },
    docState: { type: Number,optional: true, }
});

export const Ramos: any = new Mongo.Collection("ramos");
Ramos.attachSchema(schema);
