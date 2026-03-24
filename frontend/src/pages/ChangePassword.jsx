import { useState } from "react";
import API from "../api";
import { KeyRound, AlertCircle, CheckCircle } from "lucide-react";

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            return setError("Les mots de passe ne correspondent pas");
        }

        try {
            setLoading(true);

            const { data } = await API.put("/auth/change-password", {
                currentPassword,
                newPassword,
            });

            setSuccess(data.message);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err.response.data.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h3>Changer le mot de passe</h3>

            {error && (
                <div className="error-message">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {success && (
                <div className="success-message">
                    <CheckCircle size={18} /> {success}
                </div>
            )}

            <form onSubmit={handleChangePassword}>
                <div className="input-group">
                    <label>Mot de passe actuel</label>
                    <div className="input-wrapper">
                        <KeyRound size={18} />
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Nouveau mot de passe</label>
                    <div className="input-wrapper">
                        <KeyRound size={18} />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Confirmer le mot de passe</label>
                    <div className="input-wrapper">
                        <KeyRound size={18} />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Mise à jour..." : "Changer le mot de passe"}
                </button>
            </form>
        </div>
    );
};

export default ChangePassword;