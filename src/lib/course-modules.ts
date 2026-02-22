// ---------------------------------------------------------------------------
// Definición de módulos del curso
// ---------------------------------------------------------------------------
// Cada módulo agrupa lecciones por tema. Los slugs de lección deben coincidir
// con los IDs de la colección 'lessons' (que vienen de Notion).
// Para añadir un módulo o reorganizar lecciones, edita este archivo.
// ---------------------------------------------------------------------------

export interface CourseModule {
  slug: string;
  emoji: string;
  title: string;
  description: string;
  lessonSlugs: string[];
}

export const COURSE_MODULES: CourseModule[] = [
  {
    slug: 'introduccion-espacio-trabajo',
    emoji: '✏️',
    title: 'Introducción al espacio de trabajo',
    description:
      'Familiarízate con la interfaz de Notion: la barra lateral, el editor, navegación y todas las herramientas disponibles.',
    lessonSlugs: ['introduccion-espacio-trabajo'],
  },
  {
    slug: 'paginas-bloques',
    emoji: '🧱',
    title: 'Páginas y Bloques',
    description:
      'Domina los elementos fundamentales de Notion: páginas, subpáginas, bloques de contenido y estilos de texto.',
    lessonSlugs: ['paginas-bloques'],
  },
  {
    slug: 'bases-datos',
    emoji: '📊',
    title: 'Bases de Datos',
    description:
      'La funcionalidad más potente de Notion: crea bases de datos, añade propiedades, filtra, ordena y visualiza tus datos.',
    lessonSlugs: [
      'introduccion-bases-datos',
      'filtros-ordenacion',
      'vistas-bases-datos',
      'templates',
      'nuevas-bases-de-datos',
    ],
  },
  {
    slug: 'relations-rollups',
    emoji: '🕸️',
    title: 'Relations & Rollups',
    description:
      'Conecta bases de datos entre sí con Relations y extrae información con Rollups para crear sistemas más potentes.',
    lessonSlugs: ['relations', 'rollups'],
  },
  {
    slug: 'formulas',
    emoji: '➗',
    title: 'Fórmulas',
    description:
      'Calcula, transforma y automatiza datos con fórmulas: desde lo básico hasta barras de progreso personalizadas.',
    lessonSlugs: [
      'introduccion-formulas',
      'formulas-avanzadas',
      'barras-de-progreso-notion',
    ],
  },
  {
    slug: 'api-notion',
    emoji: '🔌',
    title: 'La API de Notion',
    description:
      'Conecta Notion con otras herramientas y automatiza flujos de trabajo usando la API pública.',
    lessonSlugs: ['crear-integraciones-api-notion'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Devuelve el módulo al que pertenece una lección, o undefined. */
export function getModuleForLesson(lessonSlug: string): CourseModule | undefined {
  return COURSE_MODULES.find((m) => m.lessonSlugs.includes(lessonSlug));
}

/** ¿Es un módulo con una sola lección? (clic va directo a la lección) */
export function isSingleLessonModule(mod: CourseModule): boolean {
  return mod.lessonSlugs.length === 1;
}

/** Índice del módulo en el array (0-based). */
export function getModuleIndex(moduleSlug: string): number {
  return COURSE_MODULES.findIndex((m) => m.slug === moduleSlug);
}

/** Posición de una lección dentro de su módulo (0-based). */
export function getLessonPositionInModule(
  lessonSlug: string,
  mod: CourseModule,
): number {
  return mod.lessonSlugs.indexOf(lessonSlug);
}

/** Slugs de módulos que tienen página intermedia (>1 lección). */
export function getMultiLessonModuleSlugs(): string[] {
  return COURSE_MODULES.filter((m) => !isSingleLessonModule(m)).map(
    (m) => m.slug,
  );
}
