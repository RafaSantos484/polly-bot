import { initializeApp } from "firebase/app";
import {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

type SpotifyToYoutube = {
  [spotifyId: string]: { youtubeId: string; title: string };
};

export default class Firebase {
  private firestore: Firestore;
  spotifyToYoutube: SpotifyToYoutube;

  constructor() {
    initializeApp({
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
    });
    this.firestore = getFirestore();
    this.spotifyToYoutube = {};
  }

  async getDoc(
    path: string,
    onValue?: (doc: DocumentSnapshot<DocumentData>) => void
  ) {
    const dbRef = doc(this.firestore, path);
    return onValue ? onSnapshot(dbRef, onValue) : (await getDoc(dbRef)).data();
  }

  async getSpotifyToYoutubeDoc() {
    return new Promise((resolve, reject) => {
      this.getDoc("IdConverters/SpotifyToYoutube", (snapshot) => {
        this.spotifyToYoutube = snapshot.data() as any;
        resolve(undefined);
      });
    });
  }
  async setSpotifyToYoutubeDoc(data: SpotifyToYoutube) {
    const dbRef = doc(this.firestore, "IdConverters/SpotifyToYoutube");
    await setDoc(dbRef, data);
  }
}
