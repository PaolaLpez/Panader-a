import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Copiar imágenes de panes al inicializar Vite
const srcDir = 'C:/Users/ADMIN/.gemini/antigravity/brain/0a1eb32e-ec40-4901-83c3-212cb24d6e7f';
const destDir = 'C:/Users/ADMIN/Downloads/Panadería/Frontend/public/images';

try {
  if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir);
  const conchaFile = files.find(f => f.startsWith('concha_chocolate_') && f.endsWith('.png'));
  const croissantFile = files.find(f => f.startsWith('croissant_cuernito_') && f.endsWith('.png'));
  const donaFile = files.find(f => f.startsWith('dona_chocolate_') && f.endsWith('.png'));

  const logoFile = files.find(f => f.startsWith('logo_panapina_clean_') && f.endsWith('.png'));

  if (conchaFile) fs.copyFileSync(path.join(srcDir, conchaFile), path.join(destDir, 'concha_chocolate.png'));
  if (croissantFile) fs.copyFileSync(path.join(srcDir, croissantFile), path.join(destDir, 'croissant_cuernito.png'));
  if (donaFile) fs.copyFileSync(path.join(srcDir, donaFile), path.join(destDir, 'dona_chocolate.png'));
  if (logoFile) fs.copyFileSync(path.join(srcDir, logoFile), path.join(destDir, '../logo_panapina.png'));
  
  console.log('✅ [Vite Config] Imágenes de panes y logo copiadas correctamente.');
} catch (e) {
  console.warn('⚠️ [Vite Config] Ocurrió al copiar las fotos:', e.message);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
