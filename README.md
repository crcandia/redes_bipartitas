# Redes Bipartitas y sus Proyecciones

Herramienta interactiva para enseñar redes bipartitas en el curso de **Redes y Sistemas Complejos** (Magíster en Data Science, UDD).

**Demo:** [bipartitas.criss-lab.com](https://bipartitas.criss-lab.com)

---

## ¿Qué incluye?

Cinco pestañas interactivas:

- **Concepto** — 12 tarjetas con definiciones formales, fórmulas y propiedades clave: biadjacencia, proyecciones, 4-ciclos, nestedness, redundancia y backbone extraction.
- **Constructor** — Grafo bipartito editable. Agrega y elimina aristas con un clic y observa la matriz de biadjacencia actualizarse en tiempo real. Incluye tres ejemplos precargados (actores/películas, estudiantes/cursos, autores/papers).
- **Álgebra matricial** — Visualización paso a paso de la multiplicación B·Bᵀ y Bᵀ·B. Muestra el producto punto celda a celda, iluminando las filas y columnas involucradas y explicando el significado de cada resultado.
- **Proyecciones** — Grafos de fuerza D3 para P_U y P_V con pesos en las aristas y matrices de pesos.
- **Análisis** — Métricas de red: densidad, grado medio, coeficiente de redundancia (Latapy 2008), nestedness NODF, conteo de 4-ciclos y tabla de backbone extraction con modelo nulo bipartito.

---

## Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [D3.js](https://d3js.org/) — layout de fuerza para las proyecciones

---

## Correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build para producción

```bash
npm run build
```

La carpeta `dist/` contiene el sitio estático listo para subir.

---

## Referencias

- Latapy, M., Magnien, C., & Del Vecchio, N. (2008). Basic notions for the analysis of large two-mode networks. *Social Networks*, 30(1), 31–48.
- M. E. J. Newman (2001). Scientific collaboration networks. I. Network construction and fundamental results. *Physical Review E*, Valume 64, 016131.
- Neal, Z. (2014). The backbone of bipartite projections. *Social Networks*, 39, 84–97.
- Serrano, M. Á., Boguñá, M., & Vespignani, A. (2009). Extracting the multiscale backbone of complex weighted networks. *PNAS*, 106(16), 6483–6488.
