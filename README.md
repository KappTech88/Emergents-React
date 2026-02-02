# Emergents React

A React application built with Three.js for 3D visualizations and animations.

## Deployment

This project is configured for deployment on Vercel. The `vercel.json` configuration file ensures that client-side routing works correctly by rewriting all routes to `index.html`.

### Vercel Configuration

The project includes a `vercel.json` file that:
- Builds the frontend React application
- Serves the static build output
- Rewrites all routes to `/index.html` to support client-side routing (fixes 404 errors)

### Deploying to Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the `vercel.json` configuration
3. The build process will:
   - Install dependencies with `--legacy-peer-deps` flag
   - Build the React app with `CI=false` to allow warnings
   - Deploy the production build from `frontend/build`

## Development

To run the project locally:

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

To build for production:

```bash
cd frontend
npm install --legacy-peer-deps
CI=false npm run build
```

## Known Issues & Workarounds

### ajv Dependency
The `ajv@^8` package is included as a devDependency to resolve a module resolution conflict with Create React App and newer Node versions. This is a known issue where `ajv-keywords` requires `ajv/dist/compile/codegen` which is not available in older versions of ajv that come transitively with Create React App.
