import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Search, 
  Package, 
  DollarSign, 
  Filter, 
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
// El entorno proporciona estas variables automáticamente
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'industrial-pricing-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  // Formulario State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: 'kg',
    category: 'Metales'
  });

  // 1. Manejo de Autenticación (Regla 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error de autenticación:", err);
        setError("Error al conectar con el servicio de seguridad.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // 2. Carga de Datos (Regla 1 y 2)
  useEffect(() => {
    if (!user) return;

    // Ruta estricta: /artifacts/{appId}/public/data/{collectionName}
    const materialsRef = collection(db, 'artifacts', appId, 'public', 'data', 'materials');
    
    // Consulta simple (sin orderBy complejo para evitar errores de índice)
    const q = query(materialsRef);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Ordenamos en memoria (Regla 2)
        const sortedData = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMaterials(sortedData);
        setLoading(false);
      },
      (err) => {
        console.error("Error en Firestore:", err);
        setError("No tienes permisos para ver estos datos o hubo un error de conexión.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Acciones
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.price) return;

    try {
      const materialsRef = collection(db, 'artifacts', appId, 'public', 'data', 'materials');
      await addDoc(materialsRef, {
        ...formData,
        price: parseFloat(formData.price),
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      setFormData({ name: '', price: '', unit: 'kg', category: 'Metales' });
    } catch (err) {
      setError("Error al guardar el material.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'materials', id));
    } catch (err) {
      setError("No se pudo eliminar el registro.");
    }
  };

  // Filtrado en memoria
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'Todos' || m.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, filterCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Cargando base de datos industrial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              Precios Industriales
            </h1>
            <p className="text-slate-500">Gestión de costos de suministros y materiales</p>
          </div>
          <div className="bg-white p-2 px-4 rounded-full shadow-sm border border-slate-200 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Usuario: <span className="font-mono text-xs">{user?.uid}</span>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto font-bold">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel de Control - Formulario */}
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Nuevo Registro
              </h2>
              <form onSubmit={handleAddMaterial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Material</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej. Acero Inoxidable 304"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="kg">kg</option>
                      <option value="ton">ton</option>
                      <option value="m">m</option>
                      <option value="m2">m²</option>
                      <option value="unidad">unidad</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Metales">Metales</option>
                    <option value="Polímeros">Polímeros</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Químicos">Químicos</option>
                    <option value="Electrónica">Electrónica</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus className="w-5 h-5" />
                  Guardar Material
                </button>
              </form>
            </div>
            
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
              <h3 className="font-bold mb-2">Resumen de Inventario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/30 p-3 rounded-xl border border-white/10">
                  <p className="text-blue-100 text-xs uppercase tracking-wider">Total Items</p>
                  <p className="text-2xl font-bold">{materials.length}</p>
                </div>
                <div className="bg-blue-500/30 p-3 rounded-xl border border-white/10">
                  <p className="text-blue-100 text-xs uppercase tracking-wider">Categorías</p>
                  <p className="text-2xl font-bold">{new Set(materials.map(m => m.category)).size}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Listado de Materiales */}
          <section className="lg:col-span-2 space-y-4">
            
            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="Todos">Todas las categorías</option>
                  <option value="Metales">Metales</option>
                  <option value="Polímeros">Polímeros</option>
                  <option value="Construcción">Construcción</option>
                  <option value="Químicos">Químicos</option>
                  <option value="Electrónica">Electrónica</option>
                </select>
              </div>
            </div>

            {/* Grid de Materiales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => (
                  <div 
                    key={material.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 group hover:border-blue-300 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 -mr-12 -mt-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <button 
                        onClick={() => handleDelete(material.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-lg text-slate-800 mb-1 truncate pr-8">{material.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-tighter">
                      {material.category}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-black text-slate-900">${material.price.toLocaleString()}</span>
                        <span className="text-slate-400 text-sm ml-1">/ {material.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 italic">
                        {material.createdAt?.seconds 
                          ? new Date(material.createdAt.seconds * 1000).toLocaleDateString()
                          : 'Sincronizando...'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-slate-300 w-8 h-8" />
                  </div>
                  <h4 className="text-slate-500 font-medium">No se encontraron registros</h4>
                  <p className="text-slate-400 text-sm">Prueba ajustando los filtros o agrega uno nuevo</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}