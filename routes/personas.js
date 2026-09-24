const { Router } = require('express');
const { uploadPersonaFiles } = require('../middlewares/upload');
const personas = require('../controllers/personas');
const busqueda = require('../controllers/busqueda');

const router = Router();

router.post('/', uploadPersonaFiles, personas.create);
// POST (no GET) para que término y captcha no queden en logs/URL.
// Debe ir ANTES de la ruta con parametro id para no ser capturada como id.
router.post('/buscar', busqueda.buscar);
router.get('/', personas.list);
router.get('/:id', personas.getById);
router.put('/:id', uploadPersonaFiles, personas.update);
router.delete('/:id', personas.remove);

module.exports = router;
