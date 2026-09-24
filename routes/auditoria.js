const { Router } = require('express');
const auditoria = require('../controllers/auditoria');

const router = Router();

router.get('/', auditoria.list);

module.exports = router;
