import React, { useEffect, useState } from 'react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import API from '../api';

function Rapport() {

    let navigate = useNavigate();
    let now = new Date()

    const [projets, setProjets] = useState([]);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        date: "",
        id_projet: "",
        travail_effectué: [],
        tâches_restantes: [],
        blocages: []
    });

    const [inputs, setInputs] = useState({
        travail_effectué: "",
        tâches_restantes: "",
        blocages: ""
    });

    const [editing, setEditing] = useState({
        travail_effectué: null,
        tâches_restantes: null,
        blocages: null
    });

    const fetchProjet = async () => {
        try {
            await API.get("/affectations/mes-projets")
                .then(dt => setProjets(dt.data))
        }
        catch (e) {
            console.log("err : ", e)
        }
    }

    useEffect(() => {
        fetchProjet()
    }, [])

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleKeyDown = (e, field) => {
        if (e.key === "Enter" || e.key === ";") {
            e.preventDefault();
            const values = inputs[field].split(/[;\n]/);
            let updated = [...formData[field]];

            values.forEach(val => {
                const trimmed = val.trim();
                if (!trimmed) return;
                if (editing[field] !== null) {
                    updated[editing[field]] = trimmed;
                } else {
                    updated.push(trimmed);
                }
            });

            setFormData({ ...formData, [field]: updated });
            setInputs({ ...inputs, [field]: "" });
            setEditing({ ...editing, [field]: null });
        }
    };

    const handleEdit = (field, index) => {
        setInputs({ ...inputs, [field]: formData[field][index] });
        setEditing({ ...editing, [field]: index });
    };

    const removeTag = (field, index) => {
        const updated = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (
            !formData.date ||
            !formData.id_projet ||
            formData.travail_effectué.length === 0 ||
            formData.tâches_restantes.length === 0 ||
            formData.blocages.length === 0
        ) {
            setError("Veuillez remplir tous les champs !");
            return;
        }

        try {
            setError("");
            await API.post("/rapport", formData)
            setFormData({
                date: "",
                id_projet: "",
                travail_effectué: [],
                tâches_restantes: [],
                blocages: []
            })
            setInputs({
                travail_effectué: "",
                tâches_restantes: "",
                blocages: ""
            })
            navigate("/designer/history")

        } catch (err) {
            console.log(err)
            setError("Erreur lors de l'enregistrement");
        }
    }

    let user = JSON.parse(localStorage.getItem("user"))
    console.log(user)
    return (
        <div className='containerRapport'>
            <div className='header'>
                <ArrowLeft
                    style={{ cursor: "pointer", marginTop: "8px" }}
                    onClick={() => { navigate("/designer") }}
                />

                <div>
                    <h3>Journal quotidienne</h3>

                    <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                        <Calendar />
                        <p>{now.toDateString()}</p>
                    </div>

                </div>
            </div>

            <form className='form' onSubmit={handleSubmit}>
                {error && (
                    <p className="error">{error}</p>
                )}
                <label>Date *</label><br />

                <input
                    type='date'
                    name="date"
                    placeholder="Blocage"
                    value={formData.date}
                    onChange={handleChange}
                />

                <label>Projet *</label><br />

                <select
                    name="id_projet"
                    value={formData.id_projet}
                    onChange={handleChange}
                >
                    <option value="">---choisis un projet----</option>

                    {projets.filter(p => p.id_designer === user.id)
                        .map((p) => {
                            return (
                                <option value={p.id_projet._id}>
                                    {p.id_projet.nom}
                                </option>
                            )
                        })}
                </select>

                <br /><br />

                <label>Travail effectué *</label><br />

                <textarea
                    name="travail_effectué"
                    placeholder="écrire puis Entrée ou ;"
                    value={inputs.travail_effectué}
                    onChange={(e) => setInputs({ ...inputs, travail_effectué: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, "travail_effectué")}
                    style={{ borderColor: editing.travail_effectué !== null ? "#f59e0b" : "#ccc" }}
                />
                <div className="tagsContainer">
                    {formData.travail_effectué.map((tag, index) => (
                        <div key={index} className="tag" onClick={() => handleEdit("travail_effectué", index)}>
                            {tag}
                            <span className="close" onClick={(e) => { e.stopPropagation(); removeTag("travail_effectué", index); }}>×</span>
                        </div>
                    ))}
                </div>
                <br /><br />

                <label>Tache Restantes *</label><br />

                <textarea
                    name="tâches_restantes"
                    placeholder="écrire puis Entrée ou ;"
                    value={inputs.tâches_restantes}
                    onChange={(e) => setInputs({ ...inputs, tâches_restantes: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, "tâches_restantes")}
                    style={{ borderColor: editing.tâches_restantes !== null ? "#f59e0b" : "#ccc" }}
                />
                <div className="tagsContainer">
                    {formData.tâches_restantes.map((tag, index) => (
                        <div key={index} className="tag" onClick={() => handleEdit("tâches_restantes", index)}>
                            {tag}
                            <span className="close" onClick={(e) => { e.stopPropagation(); removeTag("tâches_restantes", index); }}>×</span>
                        </div>
                    ))}
                </div>
                <br /><br />

                <label>Blocage *</label><br />

                <textarea
                    name="blocages"
                    placeholder="écrire puis Entrée ou ;"
                    value={inputs.blocages}
                    onChange={(e) => setInputs({ ...inputs, blocages: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, "blocages")}
                    style={{ borderColor: editing.blocages !== null ? "#f59e0b" : "#ccc" }}
                />
                <div className="tagsContainer">
                    {formData.blocages.map((tag, index) => (
                        <div key={index} className="tag" onClick={() => handleEdit("blocages", index)}>
                            {tag}
                            <span className="close" onClick={(e) => { e.stopPropagation(); removeTag("blocages", index); }}>×</span>
                        </div>
                    ))}
                </div>

                <button type="submit">
                    Enregistrer
                </button>

            </form>

            <style>{`

                .containerRapport{
                    padding:30px;
                    background:#f6f7f9;
                    min-height:100vh;
                }

                .header{
                    display:flex;
                    gap:15px;
                    margin-bottom:25px;
                }

                .form{
                    border:1px solid #ccc;
                    border-radius:15px;
                    padding:25px;
                    background:white;
                    max-width:700px;
                }

                select{
                    width:100%;
                    padding:10px;
                    border-radius:8px;
                    border:1px solid #ccc;
                    margin-top:5px;
                }

                textarea , input{
                    width:100%;
                    height:120px;
                    padding:10px;
                    border-radius:8px;
                    border:1px solid #ccc;
                    margin-top:5px;
                    resize:none;
                }
                
                input{
                    height:50px;
                }
                .helper{
                    font-size:13px;
                    color:#777;
                    margin-top:8px;
                }

                button{
                    margin-top:20px;
                    padding:10px 20px;
                    border:none;
                    border-radius:8px;
                    background:#2563eb;
                    color:white;
                    cursor:pointer;
                }

                button:hover{
                    background:#1d4ed8;
                }
                .error{
                    color:#dc2626;
                    background:#fee2e2;
                    padding:10px;
                    border-radius:8px;
                    margin-top:15px;
                    font-size:14px;
                }

                .tagsContainer{
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                    margin-top:10px;
                }
                .tag{
                    background:black;
                    color:white;
                    padding:6px 12px;
                    border-radius:20px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    gap:8px;
                }
                .close{
                    cursor:pointer;
                    font-weight:bold;
                }

            `}</style>

        </div>
    )
}

export default Rapport