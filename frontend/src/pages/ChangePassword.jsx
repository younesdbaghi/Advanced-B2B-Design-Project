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

    // Fonction de validation du mot de passe fort
    const validatePasswordStrength = (password) => {
        if (password.length < 8) {
            return "Le mot de passe doit contenir au moins 8 caractères";
        }
        if (!/[A-Z]/.test(password)) {
            return "Le mot de passe doit contenir au moins une majuscule";
        }
        if (!/[a-z]/.test(password)) {
            return "Le mot de passe doit contenir au moins une minuscule";
        }
        if (!/\d/.test(password)) {
            return "Le mot de passe doit contenir au moins un chiffre";
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&* etc.)";
        }
        return null;
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Vérifier si les mots de passe correspondent
        if (newPassword !== confirmPassword) {
            return setError("Les mots de passe ne correspondent pas");
        }

        // Vérifier la force du mot de passe
        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return setError(passwordError);
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
            setError(err.response?.data?.message || "Une erreur est survenue");
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
                    <small style={{ color: "#64748B", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        Doit contenir : 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial
                    </small>
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