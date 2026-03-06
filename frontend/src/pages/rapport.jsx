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
        travail_effectué: "",
        tâches_restantes: "",
        blocages: ""
    });

    const fetchProjet = async () => {
        try {
            await API.get("/projets")
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


    const handleSubmit = async (e) => {
        e.preventDefault()

        if (
            !formData.date ||
            !formData.id_projet ||
            !formData.travail_effectué ||
            !formData.tâches_restantes ||
            !formData.blocages
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

                    {projets.map((p) => {
                        return (
                            <option value={p._id}>
                                {p.nom}
                            </option>
                        )
                    })}
                </select>

                <br /><br />

                <label>Travail effectué *</label><br />

                <textarea
                    name="travail_effectué"
                    placeholder="Décrivez le travail effectué aujourd'hui..."
                    value={formData.travail_effectué}
                    onChange={handleChange}
                />
                <br /><br />

                <label>Tache Restantes *</label><br />

                <textarea
                    name="tâches_restantes"
                    placeholder="les taches restantes"
                    value={formData.tâches_restantes}
                    onChange={handleChange}
                />
                <br /><br />

                <label>Blocage *</label><br />

                <input
                    name="blocages"
                    placeholder="Blocages"
                    value={formData.blocages}
                    onChange={handleChange}
                />


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

            `}</style>

        </div>
    )
}

export default Rapport