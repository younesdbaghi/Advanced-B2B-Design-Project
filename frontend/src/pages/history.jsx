import React, { useEffect, useState } from "react";
import API from "../api";
import { Trash, Eye, Edit, X } from "lucide-react";

function History() {

    const [rapports, setRapports] = useState([]);
    const [rapport, setRapport] = useState({});
    const [id, setId] = useState(null);

    const [showView, setShowView] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);

    const [updateData, setUpdateData] = useState({
        date: "",
        travail_effectué: "",
        tâches_restantes: "",
        blocages: ""
    });

    // HANDLE INPUT CHANGE
    const handleChange = (e) => {
        const { name, value } = e.target;

        setUpdateData({
            ...updateData,
            [name]: value
        });
    };

    // FETCH RAPPORTS
    const fetchRapport = async () => {
        try {

            const res = await API.get("/rapport");

            setRapports(res.data.rapports);

        } catch (e) {
            console.log("fetch failed :", e);
        }
    };

    useEffect(() => {
        fetchRapport();
    }, []);

    // VIEW RAPPORT
    const handleView = async (id) => {
        try {

            const res = await API.get(`/rapport/${id}`);

            setRapport(res.data.rapport);
            setShowView(true);

        } catch (e) {
            console.log("err view :", e);
        }
    };

    // OPEN UPDATE
    const handleUpdate = (rapport) => {

        setId(rapport._id);

        setUpdateData({
            date: rapport.date,
            travail_effectué: rapport.travail_effectué,
            tâches_restantes: rapport.tâches_restantes,
            blocages: rapport.blocages
        });

        setShowUpdate(true);
    };

    // SUBMIT UPDATE
    const submitUpdate = async (e) => {
        e.preventDefault();

        try {

            await API.put(`/rapport/${id}`, updateData);

            setShowUpdate(false);

            fetchRapport();

        } catch (e) {
            console.log("update err", e);
        }
    };

    // DELETE
    const handleDelete = async (id) => {

        if (!window.confirm("Do you want to delete this rapport?")) return;

        try {

            await API.delete(`/rapport/${id}`);

            fetchRapport();

        } catch (e) {
            console.log("delete err", e);
        }
    };


    return (
        <div className="reports-container">

            <div className="reports-header">
                <div>
                    <h1>Historique des rapports</h1>
                    <p>Consultez et gérez tous les rapports quotidiens des designers</p>
                </div>
            </div>

            <div className="table-container">

                <table>
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>Travail effectué</th>
                            <th>Taches restantes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>

                        {rapports.map((p) => (
                            <tr key={p._id}>

                                <td>{p.date.split("T")[0]}</td>
                                <td>{p.travail_effectué}</td>
                                <td>{p.tâches_restantes}</td>

                                <td>

                                    <Eye
                                        onClick={() => handleView(p._id)}
                                        style={{ cursor: "pointer", color: "blue", marginRight: 10 }}
                                    />

                                    <Edit
                                        onClick={() => handleUpdate(p)}
                                        style={{ cursor: "pointer", color: "green", marginRight: 10 }}
                                    />

                                    <Trash
                                        onClick={() => handleDelete(p._id)}
                                        style={{ cursor: "pointer", color: "red" }}
                                    />

                                </td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </div>


            {/* VIEW MODAL */}
            {showView && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-header">
                            <h2>Détails du rapport</h2>

                            <X
                                style={{ cursor: "pointer" }}
                                onClick={() => setShowView(false)}
                            />
                        </div>

                        <div className="modal-body">

                            <p><b>Date :</b> {rapport.date.split("T")[0]}</p>
                            <p><b>Travail :</b> {rapport.travail_effectué}</p>
                            <p><b>Taches restantes :</b> {rapport.tâches_restantes}</p>
                            <p><b>blocages :</b> {rapport.blocages}</p>

                        </div>

                    </div>

                </div>
            )}


            {/* UPDATE MODAL */}
            {showUpdate && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-header">
                            <h2>Modifier rapport</h2>

                            <X
                                style={{ cursor: "pointer" }}
                                onClick={() => setShowUpdate(false)}
                            />
                        </div>

                        <form className="modal-body" onSubmit={submitUpdate}>

                            <input
                                type="date"
                                name="date"
                                value={updateData.date}
                                onChange={handleChange}
                            />

                            <textarea
                                name="travail_effectué"
                                value={updateData.travail_effectué}
                                onChange={handleChange}
                            />

                            <textarea
                                name="tâches_restantes"
                                value={updateData.tâches_restantes}
                                onChange={handleChange}
                            />

                            <input
                                name="blocages"
                                value={updateData.blocages}
                                onChange={handleChange}
                            />

                            <button className="update-btn">
                                Mettre à jour
                            </button>

                        </form>

                    </div>

                </div>
            )}

            <style>{`
                .reports-container{
padding:30px;
background:#f6f8fb;
min-height:100vh;
font-family:Arial, Helvetica, sans-serif;
}

.reports-header{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:25px;
}

.reports-header h1{
font-size:28px;
margin:0;
color:#1f2937;
}

.reports-header p{
margin-top:5px;
color:#6b7280;
font-size:14px;
}

.table-container{
background:white;
border-radius:12px;
overflow:hidden;
box-shadow:0 5px 20px rgba(0,0,0,0.05);
}

table{
width:100%;
border-collapse:collapse;
}

thead{
background:#f3f4f6;
}

th{
text-align:left;
padding:15px;
font-size:13px;
color:#6b7280;
font-weight:600;
}

td{
padding:16px;
border-top:1px solid #f1f1f1;
font-size:14px;
}

tr:hover{
background:#f9fafb;
}

/* ACTION ICONS */

td svg{
transition:0.2s;
}

td svg:hover{
transform:scale(1.2);
}

/* MODAL */

.modal-overlay{
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:rgba(0,0,0,0.45);
display:flex;
justify-content:center;
align-items:center;
z-index:1000;
}

.modal{
background:white;
width:480px;
border-radius:12px;
padding:25px;
box-shadow:0 10px 35px rgba(0,0,0,0.25);
animation:pop 0.2s ease;
}

@keyframes pop{
from{
transform:scale(0.9);
opacity:0;
}
to{
transform:scale(1);
opacity:1;
}
}

.modal-header{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:20px;
}

.modal-header h2{
font-size:20px;
margin:0;
color:#111827;
}

.modal-body{
display:flex;
flex-direction:column;
gap:15px;
}

.modal input,
.modal textarea{
width:100%;
padding:10px;
border-radius:8px;
border:1px solid #d1d5db;
font-size:14px;
outline:none;
}

.modal input:focus,
.modal textarea:focus{
border-color:#2563eb;
}

.modal textarea{
height:100px;
resize:none;
}

/* BUTTON */

.update-btn{
margin-top:10px;
padding:10px;
background:#2563eb;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
font-weight:600;
transition:0.2s;
}

.update-btn:hover{
background:#1d4ed8;
}
        `}</style>
        </div>
    );
}

export default History;