const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Usuario = require("../models/Usuario"); // Ajusta la ruta según tu estructura

mongoose.connect("mongodb+srv://geanmarco770:6QJWSQsj72427ooi@cluster1.s9kr7.mongodb.net/CRMgeek", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Conectado a MongoDB Atlas"))
.catch(err => console.error("❌ Error conectando a MongoDB:", err));

const actualizarPasswordUsuario = async () => {
    const email = "juan.perez@example.com";
    const nuevaPassword = "123456"; // La contraseña en texto plano

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    await Usuario.findOneAndUpdate(
        { email },
        { password: hashedPassword }
    );

    console.log(`✅ Contraseña actualizada para ${email}`);
    mongoose.connection.close();
};

actualizarPasswordUsuario();
