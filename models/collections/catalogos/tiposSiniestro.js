
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

TiposSiniestro = new Mongo.Collection("tiposSiniestro");

var schema = new SimpleSchema({
    _id: { type: String, optional: false, },
    descripcion: { type: String, label: "Descripción", min: 1, max: 120, optional: false, },
    abreviatura: { type: String, label: "Abreviatura", min: 1, max: 15, optional: false, },
    prefijoReferencia: { type: String, label: "Prefijo referencia", min: 1, optional: false, },
    docState: { type: Number, optional: true, }
});

TiposSiniestro.attachSchema(schema);
