import { Link } from 'react-router-dom';
import { HiOutlineHeart, HiHeart, HiOutlineBookmark, HiBookmark, HiOutlineFire } from 'react-icons/hi2';
import { IoBedOutline, IoWaterOutline } from 'react-icons/io5';
import { BiArea } from 'react-icons/bi';
import { Phone, MessageCircle, Mail, MessageSquare } from 'lucide-react';
import VerifiedBadge from './dashboard/VerifiedBadge';

const placeholderImg = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';

export default function PropertyCard({
  property,
  isLiked = false,
  isSaved = false,
  onLike,
  onSave,
  showActions = false,
}) {
  const mainImage = property.images?.[0] || placeholderImg;
  const contact = property.seller || property.agent;
  const phoneNumber = contact?.phone || '';
  const email = contact?.email || '';
  const sellerPlan = contact?.subscriptionPlan;
  const showVerified = sellerPlan === 'PRO' || sellerPlan === 'AGENCY';
  const activeBoost = property.activeBoost;
  const showBoost = !!activeBoost?.isActive;
  const digitsOnlyPhone = phoneNumber.replace(/\D/g, '');
  const whatsappPhone = digitsOnlyPhone.startsWith('0')
    ? `92${digitsOnlyPhone.slice(1)}`
    : digitsOnlyPhone.startsWith('92')
      ? digitsOnlyPhone
      : `92${digitsOnlyPhone}`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="relative">
        <Link to={`/properties/${property.id}`}>
          <img
            src={mainImage}
            alt={property.title}
            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            property.status === 'FOR_SALE'
              ? 'bg-emerald-100 text-emerald-700'
              : property.status === 'FOR_RENT'
                ? 'bg-blue-100 text-blue-700'
                : property.status === 'PAUSED'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
          }`}>
            {property.status === 'FOR_SALE'
              ? 'For Sale'
              : property.status === 'FOR_RENT'
                ? 'For Rent'
                : property.status === 'PAUSED'
                  ? 'Paused'
                  : 'Sold'}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/90 text-gray-700">
            {property.type.charAt(0) + property.type.slice(1).toLowerCase()}
          </span>
          {showBoost && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 inline-flex items-center gap-1">
              <HiOutlineFire className="h-3 w-3" /> {activeBoost.boostType}
            </span>
          )}
        </div>

        {showActions && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={(e) => { e.preventDefault(); onLike?.(property.id); }}
              aria-label={isLiked ? 'Unlike property' : 'Like property'}
              className="p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-all duration-150 active:scale-75 hover:scale-110"
            >
              {isLiked
                ? <HiHeart className="h-5 w-5 text-red-500" />
                : <HiOutlineHeart className="h-5 w-5 text-gray-600" />}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onSave?.(property.id); }}
              aria-label={isSaved ? 'Unsave property' : 'Save property'}
              className="p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-all duration-150 active:scale-75 hover:scale-110"
            >
              {isSaved
                ? <HiBookmark className="h-5 w-5 text-blue-500" />
                : <HiOutlineBookmark className="h-5 w-5 text-gray-600" />}
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold text-gray-900">
            PKR {property.price.toLocaleString()}
            {property.status === 'FOR_RENT' && <span className="text-sm font-normal text-gray-500">/mo</span>}
          </span>
        </div>

        <Link to={`/properties/${property.id}`}>
          <h3 className="font-semibold text-gray-800 mb-1 hover:text-blue-600 transition-colors line-clamp-1">
            {property.title}
          </h3>
        </Link>

        <p className="text-sm text-gray-500 mb-2 line-clamp-1">{property.address}, {property.city}</p>

        {(contact?.name || showVerified) && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
            {contact?.name && (
              <span className="truncate">
                by <span className="text-gray-700 font-medium">{contact.companyName || contact.name}</span>
              </span>
            )}
            {showVerified && <VerifiedBadge plan={sellerPlan} size="sm" showLabel={false} />}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-50 pt-3">
          <span className="flex items-center gap-1">
            <IoBedOutline className="h-4 w-4" /> {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <IoWaterOutline className="h-4 w-4" /> {property.bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <BiArea className="h-4 w-4" /> {property.area} sqft
          </span>
        </div>

        {(phoneNumber || email) && (
          <div className="mt-3 flex items-center gap-2">
            {phoneNumber && (
              <>
                <a
                  href={`tel:${phoneNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Call seller"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp seller"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={`sms:${phoneNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Message seller"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                </a>
              </>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Email seller"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {property.recommendationScore !== undefined && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
            {property.reason || `${property.recommendationScore}% match`}
          </div>
        )}
      </div>
    </div>
  );
}
