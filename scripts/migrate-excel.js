import xlsx from 'xlsx';
import pg from 'pg';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Schema Zod para validación de locales
const localSchema = z.object({
  matricula: z.string().min(1),
  nombre: z.string().min(1),
  marca: z.string().min(1),
  propiedad: z.enum(['PROPIA', 'FRANQUICIA']),
  estado: z.string().optional(),
  pais: z.string().optional(),
  ccaa: z.string().optional(),
  provincia: z.string().optional(),
  municipio: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  ceco: z.string().optional(),
  razon_social: z.string().optional()
});

// Mapa de códigos de marca LO → LOB
const normalizeMarca = (codigo) => {
  if (codigo === 'LO') return 'LOB';
  return codigo;
};

// Convertir fecha serial Excel a ISO 8601
const excelDateToISO = (serial) => {
  if (!serial) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000).toISOString();
};

async function migrate() {
  console.log('📊 Iniciando migración de locales desde Excel...');

  try {
    await pool.query('BEGIN');

    // Leer Directorio de Unidades
    console.log('📖 Leyendo Directorio_de_Unidades.xlsx...');
    let workbook, data;

    try {
      workbook = xlsx.readFile('./DOCS/Directorio_de_Unidades.xlsx');
    } catch (error) {
      console.warn('⚠️ Directorio_de_Unidades.xlsx no encontrado. Usando datos de prueba...');
      data = [];
    }

    if (workbook) {
      const sheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'UNIFICADO') || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
    }

    console.log(`📄 ${data.length} filas encontradas`);

    // Obtener IDs de marcas desde DB
    const marcasResult = await pool.query('SELECT id, codigo FROM marcas');
    const marcaMap = new Map(marcasResult.rows.map(m => [m.codigo, m.id]));

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const normalizedRow = {
          matricula: row.MATRICULA || row.matricula,
          nombre: row.NOMBRE || row.nombre || row['Nombre Local'],
          marca: normalizeMarca(row.MARCA || row.marca || row.Código),
          propiedad: row.PROPIEDAD || row.propiedad || row.Tipo,
          estado: row.ESTADO || row.estado || 'Sin clasificar',
          pais: row.PAÍS || row.pais,
          ccaa: row.CCAA || row.ccaa,
          provincia: row.PROVINCIA || row.provincia,
          municipio: row.MUNICIPIO || row.municipio,
          direccion: row.DIRECCIÓN || row.direccion,
          telefono: row.TELÉFONO || row.telefono,
          ceco: row.CECO || row.ceco,
          razon_social: row.RAZÓN_SOCIAL || row['Razón Social']
        };

        const validated = localSchema.parse(normalizedRow);

        const marcaId = marcaMap.get(validated.marca);
        if (!marcaId) {
          console.warn(`⚠️ Marca no encontrada: ${validated.marca} para ${validated.matricula}`);
          skipped++;
          continue;
        }

        // Verificar si ya existe
        const existing = await pool.query(
          'SELECT id FROM locales WHERE matricula = $1',
          [validated.matricula]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        await pool.query(
          `INSERT INTO locales (matricula, nombre, marca_id, propiedad, estado, pais, ccaa, provincia, municipio, direccion, telefono, ceco, razon_social)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            validated.matricula,
            validated.nombre,
            marcaId,
            validated.propiedad,
            validated.estado,
            validated.pais,
            validated.ccaa,
            validated.provincia,
            validated.municipio,
            validated.direccion,
            validated.telefono,
            validated.ceco,
            validated.razon_social
          ]
        );

        imported++;
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.warn(`⚠️ Validación error en fila: ${JSON.stringify(row)}`, error.errors);
        } else {
          console.error(`❌ Error procesando fila:`, error);
          errors++;
        }
      }
    }

    await pool.query('COMMIT');

    console.log('\n📊 Resumen de migración:');
    console.log(`✅ Importados: ${imported}`);
    console.log(`⏭️  Omitidos (existen): ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total procesados: ${imported + skipped + errors}`);
    console.log('\n🎉 Migración completada');

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
