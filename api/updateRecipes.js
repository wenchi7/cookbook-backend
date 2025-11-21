/* global process */
import axios from 'axios'
import admin from 'firebase-admin'

if (!admin.apps.length) {
   console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  console.log('Service Account loaded')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  console.log('Firebase initialized')
}

const db = admin.firestore()
export const config = {
  schedule: '0 0 * * *',
}
export default async function handler(request, res) {
  try {
    const apiKey = process.env.SPOONACULAR_API_KEY
    console.log('API Key:', !!apiKey)
    const response = await axios.get('https://api.spoonacular.com/recipes/random', {
      params: {
        number: 20,
        apiKey: apiKey,
      },
    })

    const data = response.data

    if (!data.recipes) throw new Error('無法取得食譜資料')

    const batch = db.batch()
    const recipesRef = db.collection('dailyRecipes')

    const docs = await recipesRef.get()
    docs.forEach((doc) => batch.delete(doc.ref))

    data.recipes.forEach((recipe) => {
      const docRef = recipesRef.doc()
      batch.set(docRef, recipe)
    })

    await batch.commit()

    return res.status(200).json({ message: '已更新今日食譜', count: data.recipes.length })
  } catch (err) {
    // return res.status(500).json({ error: err.message }),
    console.error('初始化錯誤:', err)
    throw err
  }
}
