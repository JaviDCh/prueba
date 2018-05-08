
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

var schema = new SimpleSchema({
    _id: { type: String, optional: false },
    moneda: { type: String, label: "Moneda", optional: false, min: 1, },
    banco: { type: String, label: "Banco", optional: false, min: 1, },
    tipo: { type: String, label: "Tipo", optional: false, min: 1, },
    numero: { type: String, label: "Número", optional: false, min: 1, },
    descripcionPlantillas: { type: String, label: "Descripción para plantillas", optional: true, },
    suspendida: { type: Boolean, label: "Suspendida?", optional: true },
    cuentaContable: { type: String, label: "Cuenta contable", optional: true, min: 1, max: 25, },
    cia: { type: String, label: "Cia", optional: false, },
    docState: { type: Number, optional: true, },
});

export const CuentasBancarias: any = new Mongo.Collection("cuentasBancarias");
CuentasBancarias.attachSchema(schema);
