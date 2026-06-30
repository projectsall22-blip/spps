import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Eye, X, Check } from 'lucide-react';
import { getCroppedImg } from '../../utils/cropImage';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';

const EditableAvatar = ({ currentImage }) => {
  const { updateUser } = useAuth();
  const fileInputRef = useRef(null); // To trigger file picker

  // States
  const [image, setImage] = useState(null); 
  const [isViewOpen, setIsViewOpen] = useState(false); // View Full Image
  const [isCropOpen, setIsCropOpen] = useState(false); // Cropper Modal
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Cropper States
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    setSubmitting(true);
    try {
      const croppedBase64 = await getCroppedImg(image, croppedAreaPixels);
      const res = await API.put('/users/profile-picture', { image: croppedBase64 });
      updateUser({ profileImage: res.data.profileImage });
      setToast({ message: "Profile updated!", type: "success" });
      setIsCropOpen(false);
    } catch (err) {
      setToast({ message: "Upload failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative group">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* 1. THE AVATAR CONTAINER */}
      <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-50 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
        {currentImage ? (
          <img src={currentImage} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-black text-primary/30 uppercase">Photo</span>
        )}

        {/* 2. DUAL-ACTION OVERLAY */}
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          
          {/* VIEW BUTTON (Only if image exists) */}
          {currentImage && (
            <button 
              onClick={() => setIsViewOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black text-white uppercase bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-full transition-all"
            >
              <Eye size={14} /> View
            </button>
          )}

          {/* CHANGE BUTTON */}
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 text-[10px] font-black text-white uppercase bg-primary hover:bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg transition-all"
          >
            <Camera size={14} /> Change
          </button>
        </div>
      </div>

      {/* HIDDEN FILE INPUT */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      {/* 3. MODAL: VIEW IMAGE */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Profile Photo Preview">
        <div className="flex flex-col items-center gap-4">
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                <img src={currentImage} alt="Full View" className="w-full h-full object-cover" />
            </div>
            <Button variant="outline" onClick={() => setIsViewOpen(false)} icon={X}>Close Preview</Button>
        </div>
      </Modal>

      {/* 4. MODAL: CROP IMAGE */}
      <Modal isOpen={isCropOpen} onClose={() => setIsCropOpen(false)} title="Adjust New Photo">
        <div className="space-y-6">
          <div className="relative h-64 md:h-80 w-full bg-gray-900 rounded-2xl overflow-hidden">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black text-gray-400 uppercase">Pinch or Scroll to Zoom</p>
             <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} className="w-full accent-primary" />
          </div>
          <div className="flex gap-3">
             <Button variant="ghost" fullWidth onClick={() => setIsCropOpen(false)}>Cancel</Button>
             <Button fullWidth isLoading={submitting} onClick={handleUpload} icon={Check}>Apply Change</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EditableAvatar;